//go:build windows

package gui

import (
        "fmt"
        "syscall"
        "unsafe"

        "fusionador/internal/i18n"
)

// crearControles construye la botonera, la lista, el combo, el progreso y
// la barra de estado.
func (a *App) crearControles() {
        a.fuente = ventanaFuente(a.dpi, 9)

        crear := func(clase string, texto string, estilo uintptr, id int, x, y, w, h int32) uintptr {
                t, _ := syscall.UTF16PtrFromString(texto)
                hwnd, _, _ := procCreateWindowExW.Call(
                        0,
                        uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr(clase))),
                        uintptr(unsafe.Pointer(t)),
                        uintptr(WS_CHILD|WS_VISIBLE|estilo),
                        uintptr(x), uintptr(y), uintptr(w), uintptr(h),
                        a.hwnd, uintptr(id), a.inst, 0)
                if hwnd != 0 && a.fuente != 0 {
                        sendMessage(hwnd, WM_SETFONT, a.fuente, 1)
                }
                return hwnd
        }

        p := a.esc(12) // margen
        altoBoton := a.esc(34)

        // Botonera superior.
        x := p
        a.hAnadir = crear("BUTTON", i18n.BotonAnadir, WS_TABSTOP|BS_DEFPUSHBUTTON, idBotonAnadir, x, p, a.esc(150), altoBoton)
        x += a.esc(158)
        a.hQuitar = crear("BUTTON", i18n.BotonQuitar, WS_TABSTOP, idBotonQuitar, x, p, a.esc(105), altoBoton)
        x += a.esc(113)
        a.hSubir = crear("BUTTON", i18n.BotonSubir, WS_TABSTOP, idBotonSubir, x, p, a.esc(95), altoBoton)
        x += a.esc(103)
        a.hBajar = crear("BUTTON", i18n.BotonBajar, WS_TABSTOP, idBotonBajar, x, p, a.esc(95), altoBoton)
        x += a.esc(103)
        a.hVaciar = crear("BUTTON", i18n.BotonVaciar, WS_TABSTOP, idBotonVaciar, x, p, a.esc(120), altoBoton)

        // Lista de pistas.
        a.hLista = crear("SysListView32", "",
                WS_TABSTOP|WS_BORDER|LVS_REPORT|LVS_SHOWSELALWAYS,
                idLista, p, p+altoBoton+a.esc(10), a.esc(600), a.esc(300))
        sendMessage(a.hLista, LVM_SETEXTENDEDLISTVIEWSTYLE, 0,
                LVS_EX_FULLROWSELECT|LVS_EX_DOUBLEBUFFER)

        a.columna(i18n.ColNum, a.esc(36))
        a.columna(i18n.ColNombre, a.esc(300))
        a.columna(i18n.ColFormato, a.esc(70))
        a.columna(i18n.ColDur, a.esc(90))
        a.columna(i18n.ColInfo, a.esc(170))

        // Fila de opciones.
        y := p + altoBoton + a.esc(10) + a.esc(300) + a.esc(14)
        a.hEtiqueta = crear("STATIC", i18n.EtiquetaFormatoSalida, 0, idEtiqueta, p, y+a.esc(6), a.esc(120), a.esc(22))
        a.hCombo = crear("COMBOBOX", "", WS_TABSTOP|CBS_DROPDOWNLIST|WS_BORDER, idComboFormato, p+a.esc(126), y, a.esc(250), a.esc(300))
        sendMessage(a.hCombo, CB_ADDSTRING, 0, uintptr(unsafe.Pointer(utf16p(i18n.OpcionWav))))
        sendMessage(a.hCombo, CB_ADDSTRING, 0, uintptr(unsafe.Pointer(utf16p(i18n.OpcionMp3))))
        sendMessage(a.hCombo, CB_SETCURSEL, 0, 0)

        // Botones de acción (derecha de la misma fila).
        a.hFusionar = crear("BUTTON", i18n.BotonFusionar, WS_TABSTOP|BS_DEFPUSHBUTTON, idBotonFusionar, p+a.esc(560), y, a.esc(150), altoBoton)
        a.hCancelar = crear("BUTTON", i18n.BotonCancelar, WS_TABSTOP, idBotonCancelar, p+a.esc(718), y, a.esc(100), altoBoton)

        // Progreso + texto de estado.
        y += altoBoton + a.esc(14)
        a.hProgreso = crear("msctls_progress32", "", WS_BORDER, idProgreso, p, y, a.esc(560), a.esc(22))
        a.hEstado = crear("STATIC", i18n.EstadoListo, 0, idEstado, p+a.esc(575), y+2, a.esc(320), a.esc(20))

        // Barra de estado inferior.
        a.hStatusBar = crear("msctls_statusbar32", "", WS_BORDER, 900, p, p, a.esc(400), a.esc(26))
        setWindowText(a.hStatusBar, i18n.HintArrastra)

        // Arrastre de archivos desde el Explorador.
        procDragAcceptFiles.Call(a.hwnd, 1)

        enableWindow(a.hCancelar, false)
        a.layout()
}

// columna inserta una columna en la lista.
func (a *App) columna(titulo string, ancho int32) {
        c := LVCOLUMNW{Mask: LVCF_TEXT | LVCF_WIDTH, Fmt: LVCFMT_LEFT, Cx: ancho, PszText: utf16p(titulo)}
        sendMessage(a.hLista, LVM_INSERTCOLUMNW, 0xFFFFFFFF, uintptr(unsafe.Pointer(&c)))
}

// layout recoloca los controles según el área cliente actual.
func (a *App) layout() {
        w, h := getClientRect(a.hwnd)
        p := a.esc(12)
        altoBoton := a.esc(34)
        altoBarra := a.esc(26)

        altoLista := h - altoBarra - p*4 - altoBoton*2 - a.esc(48)
        if altoLista < a.esc(120) {
                altoLista = a.esc(120)
        }
        // Botonera (x ya fijado al crear).
        moveWindow(a.hAnadir, p, p, a.esc(150), altoBoton, true)
        moveWindow(a.hQuitar, p+a.esc(158), p, a.esc(105), altoBoton, true)
        moveWindow(a.hSubir, p+a.esc(271), p, a.esc(95), altoBoton, true)
        moveWindow(a.hBajar, p+a.esc(374), p, a.esc(95), altoBoton, true)
        moveWindow(a.hVaciar, p+a.esc(477), p, a.esc(120), altoBoton, true)

        // Lista.
        yLista := p + altoBoton + a.esc(10)
        moveWindow(a.hLista, p, yLista, w-p*2, altoLista, true)

        // Columnas proporcionales al ancho.
        nombre := w - p*2 - a.esc(36+70+90+170+20)
        if nombre < a.esc(120) {
                nombre = a.esc(120)
        }
        sendMessage(a.hLista, LVM_SETCOLUMNWIDTH, 0, uintptr(a.esc(36)))
        sendMessage(a.hLista, LVM_SETCOLUMNWIDTH, 1, uintptr(nombre))
        sendMessage(a.hLista, LVM_SETCOLUMNWIDTH, 2, uintptr(a.esc(70)))
        sendMessage(a.hLista, LVM_SETCOLUMNWIDTH, 3, uintptr(a.esc(90)))
        sendMessage(a.hLista, LVM_SETCOLUMNWIDTH, 4, uintptr(a.esc(170)))

        // Fila de opciones.
        y := yLista + altoLista + a.esc(14)
        moveWindow(a.hEtiqueta, p, y+a.esc(6), a.esc(120), a.esc(22), true)
        moveWindow(a.hCombo, p+a.esc(126), y, a.esc(250), a.esc(300), true)
        moveWindow(a.hFusionar, w-p-a.esc(260), y, a.esc(150), altoBoton, true)
        moveWindow(a.hCancelar, w-p-a.esc(100), y, a.esc(100), altoBoton, true)

        // Progreso.
        y2 := y + altoBoton + a.esc(14)
        moveWindow(a.hProgreso, p, y2, a.esc(560), a.esc(22), true)
        moveWindow(a.hEstado, p+a.esc(575), y2+2, w-p*2-a.esc(575), a.esc(20), true)

        // Barra de estado.
        moveWindow(a.hStatusBar, 0, h-altoBarra, w, altoBarra, true)
}

// crearMenu construye la barra de menú y la tabla de aceleradores.
func (a *App) crearMenu() {
        barra, _, _ := procCreateMenu.Call()

        // Archivo
        mArchivo, _, _ := procCreatePopupMenu.Call()
        procAppendMenuW.Call(mArchivo, MF_STRING, uintptr(cmdAnadir), uintptr(unsafe.Pointer(utf16p(i18n.MenuAnadir))))
        procAppendMenuW.Call(mArchivo, MF_STRING, uintptr(cmdFusionar), uintptr(unsafe.Pointer(utf16p(i18n.MenuFusionar))))
        procAppendMenuW.Call(mArchivo, MF_SEPARATOR, 0, 0)
        procAppendMenuW.Call(mArchivo, MF_STRING, uintptr(cmdSalir), uintptr(unsafe.Pointer(utf16p(i18n.MenuSalir))))
        procAppendMenuW.Call(barra, MF_POPUP, mArchivo, uintptr(unsafe.Pointer(utf16p(i18n.MenuArchivo))))

        // Ayuda
        mAyuda, _, _ := procCreatePopupMenu.Call()
        procAppendMenuW.Call(mAyuda, MF_STRING, uintptr(cmdAcerca), uintptr(unsafe.Pointer(utf16p(i18n.MenuAcerca))))
        procAppendMenuW.Call(barra, MF_POPUP, mAyuda, uintptr(unsafe.Pointer(utf16p(i18n.MenuAyuda))))

        procSetMenu.Call(a.hwnd, barra)

        // Aceleradores: Ctrl+A, Ctrl+M, Supr, Alt+↑, Alt+↓, F1.
        acs := []ACCEL{
                {FVirt: FVIRTKEY | FCONTROL, Key: 'A', Cmd: cmdAnadir},
                {FVirt: FVIRTKEY | FCONTROL, Key: 'M', Cmd: cmdFusionar},
                {FVirt: FVIRTKEY, Key: VK_DELETE, Cmd: cmdQuitar},
                {FVirt: FVIRTKEY | FALT, Key: VK_UP, Cmd: cmdSubir},
                {FVirt: FVIRTKEY | FALT, Key: VK_DOWN, Cmd: cmdBajar},
                {FVirt: FVIRTKEY, Key: VK_F1, Cmd: cmdAcerca},
        }
        h, _, _ := procCreateAcceleratorW.Call(uintptr(unsafe.Pointer(&acs[0])), uintptr(len(acs)))
        a.hAcelerador = h
}

// menuContextual muestra Quitar/Subir/Bajar sobre la lista.
func (a *App) menuContextual(lParam uintptr) {
        if a.fusionando || a.arrastrando {
                return
        }
        var pt POINT
        pt.X = int32(int16(loWord(lParam)))
        pt.Y = int32(int16(hiWord(lParam)))
        menu, _, _ := procCreatePopupMenu.Call()
        procAppendMenuW.Call(menu, MF_STRING, uintptr(cmdQuitar), uintptr(unsafe.Pointer(utf16p(i18n.MenuCtxQuitar))))
        procAppendMenuW.Call(menu, MF_STRING, uintptr(cmdSubir), uintptr(unsafe.Pointer(utf16p(i18n.MenuCtxSubir))))
        procAppendMenuW.Call(menu, MF_STRING, uintptr(cmdBajar), uintptr(unsafe.Pointer(utf16p(i18n.MenuCtxBajar))))
        var cli POINT = pt
        procScreenToClient.Call(a.hwnd, uintptr(unsafe.Pointer(&cli)))
        _ = cli
        r, _, _ := procTrackPopupMenu.Call(menu,
                uintptr(TPM_RIGHTBUTTON|TPM_RETURNCMD),
                uintptr(uint32(pt.X)), uintptr(uint32(pt.Y)), 0, a.hwnd, 0)
        switch r {
        case cmdQuitar:
                a.quitarSeleccion()
        case cmdSubir:
                a.moverSeleccion(-1)
        case cmdBajar:
                a.moverSeleccion(1)
        }
}

// refrescarBotones habilita/deshabilita según el estado.
func (a *App) refrescarBotones() {
        if a.hwnd == 0 {
                return
        }
        n := int32(sendMessage(a.hLista, LVM_GETSELECTEDCOUNT, 0, 0))
        sel := n > 0
        total := int32(len(a.pistas))
        enCurso := a.fusionando

        enableWindow(a.hAnadir, !enCurso)
        enableWindow(a.hQuitar, sel && !enCurso)
        enableWindow(a.hVaciar, total > 0 && !enCurso)
        enableWindow(a.hLista, !enCurso)
        enableWindow(a.hCombo, !enCurso)
        enableWindow(a.hFusionar, total >= 2 && !enCurso)
        enableWindow(a.hCancelar, enCurso)

        if sel && !enCurso {
                first := a.primerSeleccionado()
                last := a.ultimoSeleccionado()
                enableWindow(a.hSubir, first > 0)
                enableWindow(a.hBajar, last < total-1)
        } else {
                enableWindow(a.hSubir, false)
                enableWindow(a.hBajar, false)
        }
}

// refrescarLista reconstruye las filas de la lista desde el estado.
func (a *App) refrescarLista() {
        sendMessage(a.hLista, LVM_DELETEALLITEMS, 0, 0)
        for i, pista := range a.pistas {
                idx := int32(i)
                textoItem(a.hLista, idx, 0, fmt.Sprintf("%d", i+1))
                textoItem(a.hLista, idx, 1, pista.Nombre)
                textoItem(a.hLista, idx, 2, pista.Formato)
                textoItem(a.hLista, idx, 3, i18n.FormatoDuracion(pista.Duracion))
                textoItem(a.hLista, idx, 4, fmt.Sprintf("%s · %s · %s",
                        i18n.FormatoTasa(pista.Tasa), i18n.DescripcionCanales(pista.Canales),
                        i18n.FormatoTamanyo(pista.Bytes)))
        }
        if len(a.pistas) == 0 {
                setWindowText(a.hStatusBar, i18n.HintArrastra)
        } else if len(a.pistas) == 1 {
                setWindowText(a.hStatusBar, fmt.Sprintf(i18n.EstadoNPistas, len(a.pistas), i18n.HintArrastra))
        } else {
                // con 2+ pistas el ORDEN importa: se enseña cómo controlarlo
                setWindowText(a.hStatusBar, fmt.Sprintf(i18n.EstadoNPistas, len(a.pistas), i18n.HintOrden))
        }
}

// textoItem escribe el texto de un ítem/subítem de la lista.
func textoItem(lista uintptr, i int32, sub int32, texto string) {
        t, _ := syscall.UTF16PtrFromString(texto)
        item := LVITEMW{Mask: LVIF_TEXT, IItem: i, ISubItem: sub, PszText: t}
        if sub == 0 {
                sendMessage(lista, LVM_INSERTITEMW, 0, uintptr(unsafe.Pointer(&item)))
        } else {
                sendMessage(lista, LVM_SETITEMW, 0, uintptr(unsafe.Pointer(&item)))
        }
}

// seleccionados devuelve los índices seleccionados en orden ascendente.
func (a *App) seleccionados() []int32 {
        var out []int32
        i := int32(-1)
        for {
                r := sendMessage(a.hLista, LVM_GETNEXTITEM, uintptr(uint32(i)), LVNI_SELECTED)
                if int32(r) < 0 {
                        break
                }
                i = int32(r)
                out = append(out, i)
        }
        return out
}

func (a *App) primerSeleccionado() int32 {
        s := a.seleccionados()
        if len(s) == 0 {
                return -1
        }
        return s[0]
}

func (a *App) ultimoSeleccionado() int32 {
        s := a.seleccionados()
        if len(s) == 0 {
                return -1
        }
        return s[len(s)-1]
}

// desSeleccionarTodo limpia la selección de la lista (wParam -1 = todos).
func (a *App) desSeleccionarTodo() {
        item := LVITEMW{Mask: LVIF_STATE, State: 0, StateMask: LVIS_SELECTED}
        sendMessage(a.hLista, LVM_SETITEMSTATE, ^uintptr(0), uintptr(unsafe.Pointer(&item)))
}

// seleccionar marca un ítem, lo enfoca, lo hace visible y lleva el foco de
// teclado a la lista (para que Alt+↑/↓ y Supr funcionen de inmediato).
func (a *App) seleccionar(i int32) {
        item := LVITEMW{Mask: LVIF_STATE, State: LVIS_SELECTED | LVIS_FOCUSED, StateMask: LVIS_SELECTED | LVIS_FOCUSED}
        sendMessage(a.hLista, LVM_SETITEMSTATE, uintptr(uint32(i)), uintptr(unsafe.Pointer(&item)))
        sendMessage(a.hLista, LVM_ENSUREVISIBLE, uintptr(uint32(i)), 0)
        procSetFocus.Call(a.hLista)
}
