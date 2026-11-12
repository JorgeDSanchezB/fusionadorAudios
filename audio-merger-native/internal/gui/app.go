//go:build windows

package gui

import (
        "context"
        "fmt"
        "runtime"
        "sync"
        "syscall"
        "unsafe"

        "fusionador/internal/config"
        "fusionador/internal/i18n"
)

// IDs de controles hijos.
const (
        idBotonAnadir   = 101
        idBotonQuitar   = 102
        idBotonSubir    = 103
        idBotonBajar    = 104
        idBotonVaciar   = 105
        idLista         = 106
        idComboFormato  = 107
        idBotonFusionar = 108
        idBotonCancelar = 109
        idEtiqueta      = 110
        idProgreso      = 111
        idEstado        = 112
)

// Mensajes de la goroutine de fusión a la UI.
const (
        msgProgreso = WM_APP + 1
        msgFin      = WM_APP + 2
)

// Comandos de menú/acelerador.
const (
        cmdAnadir   = 2001
        cmdFusionar = 2002
        cmdSalir    = 2003
        cmdAcerca   = 2004
        cmdQuitar   = 2005
        cmdSubir    = 2006
        cmdBajar    = 2007
)

// App concentra el estado de la aplicación.
type App struct {
        hwnd   uintptr
        inst   uintptr
        fuente uintptr
        dpi    int32

        hAnadir, hQuitar, hSubir, hBajar, hVaciar uintptr
        hLista, hCombo, hFusionar, hCancelar      uintptr
        hEtiqueta, hProgreso, hEstado, hStatusBar uintptr
        hAcelerador                               uintptr

        // pistas en orden de fusión
        pistas []infoPista

        // arrastre interno de reordenación (D-18)
        arrastrando bool
        dragOrigen  int32
        dragDestino int32

        // fusión en curso
        fusionando bool
        cancelFunc context.CancelFunc
        hecho      chan struct{}
        resultado  error
        mu         sync.Mutex
        salidaUlt  string
}

// Ejecutar crea la ventana principal y corre el bucle de mensajes (bloquea).
func Ejecutar() error {
        // D-16: cablea esta goroutine (la del bucle de mensajes) a su hilo OS
        // actual. Windows reparte los mensajes de una ventana SOLO al hilo que
        // la creó; si el runtime migra la goroutine a otro hilo (syscalls
        // bloqueantes: GetMessageW en reposo, diálogo modal, MessageBox), la
        // cola deja de bombearse y la ventana se congela. Era el bug de la
        // 1.0.0: «se cuelga al intentar cargar cualquier audio».
        runtime.LockOSThread()

        if err := config.Validar(); err != nil {
                return err
        }
        icc := INITCOMMONCONTROLSEX{DwSize: uint32(unsafe.Sizeof(INITCOMMONCONTROLSEX{})), DwICC: 0xFFFFFFFF}
        procInitCommonControlsEx.Call(uintptr(unsafe.Pointer(&icc)))

        inst, _, _ := procGetModuleHandleW.Call(0)

        a := &App{inst: inst, dpi: dpiPantalla()}

        className, _ := syscall.UTF16PtrFromString("FusionadorDeAudioVentana")
        // icono del resource PE (ID 1, embebido por goversioninfo — D-15)
        hIcon, _, _ := procLoadIconW.Call(inst, 1)
        wc := WNDCLASSEXW{
                CbSize:        uint32(unsafe.Sizeof(WNDCLASSEXW{})),
                LpfnWndProc:   syscall.NewCallback(a.wndProc),
                HInstance:     inst,
                HbrBackground: 6, // (COLOR_WINDOW + 1)
                LpszClassName: className,
                HIcon:         hIcon,
                HIconSm:       hIcon,
        }
        if r, _, _ := procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc))); r == 0 {
                return fmt.Errorf("RegisterClassExW falló")
        }

        titulo, _ := syscall.UTF16PtrFromString(i18n.TituloVentana)
        hwnd, _, _ := procCreateWindowExW.Call(
                0,
                uintptr(unsafe.Pointer(className)),
                uintptr(unsafe.Pointer(titulo)),
                uintptr(WS_OVERLAPPEDWINDOW),
                uintptr(CW_USEDEFAULT), uintptr(CW_USEDEFAULT),
                uintptr(a.esc(860)), uintptr(a.esc(580)),
                0, 0, inst, 0)
        if hwnd == 0 {
                return fmt.Errorf("CreateWindowExW falló")
        }
        a.hwnd = hwnd
        procShowWindow.Call(hwnd, uintptr(SW_SHOWNORMAL))
        procUpdateWindow.Call(hwnd)

        var msg MSG
        for {
                r, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
                if int32(r) <= 0 {
                        break
                }
                if a.hAcelerador != 0 {
                        tr, _, _ := procTranslateAcceleratorW.Call(hwnd, a.hAcelerador, uintptr(unsafe.Pointer(&msg)))
                        if tr != 0 {
                                continue
                        }
                }
                procTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
                procDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
        }
        return nil
}

func (a *App) esc(v int32) int32 { return escala(v, a.dpi) }

// wndProc enruta los mensajes de la ventana principal.
func (a *App) wndProc(hwnd uintptr, msg uint32, wParam, lParam uintptr) uintptr {
        switch msg {
        case WM_CREATE:
                a.hwnd = hwnd
                a.crearControles()
                a.crearMenu()
                a.refrescarLista()
                a.refrescarBotones()
                return 0

        case WM_SIZE:
                a.layout()
                return 0

        case WM_COMMAND:
                cmd, notif := loWord(wParam), hiWord(wParam)
                switch cmd {
                case idBotonAnadir:
                        if notif == BN_CLICKED {
                                a.anadirArchivos()
                        }
                case idBotonQuitar:
                        if notif == BN_CLICKED {
                                a.quitarSeleccion()
                        }
                case idBotonSubir:
                        if notif == BN_CLICKED {
                                a.moverSeleccion(-1)
                        }
                case idBotonBajar:
                        if notif == BN_CLICKED {
                                a.moverSeleccion(1)
                        }
                case idBotonVaciar:
                        if notif == BN_CLICKED {
                                a.vaciar()
                        }
                case idBotonFusionar:
                        if notif == BN_CLICKED {
                                a.iniciarFusion()
                        }
                case idBotonCancelar:
                        if notif == BN_CLICKED {
                                a.cancelarFusion()
                        }
                case idComboFormato:
                        if notif == CBN_SELCHANGE {
                                a.refrescarBotones()
                        }
                case cmdAnadir:
                        a.anadirArchivos()
                case cmdFusionar:
                        a.iniciarFusion()
                case cmdSalir:
                        procDestroyWindow.Call(hwnd)
                case cmdAcerca:
                        a.acercaDe()
                case cmdQuitar:
                        a.quitarSeleccion()
                case cmdSubir:
                        a.moverSeleccion(-1)
                case cmdBajar:
                        a.moverSeleccion(1)
                }
                return 0

        case WM_NOTIFY:
                // Patrón Win32: lParam ES un puntero a NMHDR (falso positivo de vet).
                nm := (*NMHDR)(unsafe.Pointer(lParam))
                if nm != nil && nm.HwndFrom == a.hLista {
                        switch nm.Code {
                        case LVN_ITEMCHANGED:
                                a.refrescarBotones()
                        case LVN_BEGINDRAG:
                                // D-18: reordenación por arrastre dentro de la lista.
                                nmlv := (*NMLISTVIEW)(unsafe.Pointer(lParam))
                                a.iniciarArrastre(nmlv.IItem)
                        }
                }
                return 0

        case WM_CONTEXTMENU:
                if wParam == a.hLista {
                        a.menuContextual(lParam)
                        return 0
                }

        case WM_DROPFILES:
                a.soltarArchivos(wParam)
                return 0

        case WM_MOUSEMOVE:
                if a.arrastrando {
                        a.moverArrastre()
                        return 0
                }

        case WM_LBUTTONUP:
                if a.arrastrando {
                        a.soltarArrastre()
                        return 0
                }

        case WM_CAPTURECHANGED:
                if a.arrastrando {
                        a.cancelarArrastre()
                        return 0
                }

        case msgProgreso:
                a.actualizarProgreso(uint32(wParam))
                return 0

        case msgFin:
                a.finFusion()
                return 0

        case WM_CLOSE:
                if a.fusionando {
                        r := messageBox(hwnd, i18n.TxtSalirDuranteFusion, i18n.TituloSalirDuranteFusion,
                                MB_YESNO|MB_ICONQUESTION)
                        if r != IDYES {
                                return 0
                        }
                        if a.cancelFunc != nil {
                                a.cancelFunc()
                        }
                        a.esperarWorker()
                }
                procDestroyWindow.Call(hwnd)
                return 0

        case WM_DESTROY:
                procPostQuitMessage.Call(0)
                return 0
        }
        r, _, _ := procDefWindowProcW.Call(hwnd, uintptr(msg), wParam, lParam)
        return r
}

// acercaDe muestra el diálogo «Acerca de».
func (a *App) acercaDe() {
        messageBox(a.hwnd,
                fmt.Sprintf(i18n.TxtAcerca, config.Version),
                i18n.TituloAcerca, MB_OK|MB_ICONINFORMATION)
}
