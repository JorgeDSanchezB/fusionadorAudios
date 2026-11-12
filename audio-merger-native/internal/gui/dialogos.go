//go:build windows

package gui

import (
        "fmt"
        "path/filepath"
        "strings"
        "unicode/utf16"
        "unsafe"

        "fusionador/internal/audio"
        "fusionador/internal/config"
        "fusionador/internal/i18n"
)

// infoPista es una pista añadida (info de la sonda + estado UI).
type infoPista struct {
        audio.Info
        Ok bool // sonda válida
}

// anadirArchivos abre el diálogo multiselección y añade las pistas sondadas.
func (a *App) anadirArchivos() {
        if a.fusionando || a.arrastrando {
                return
        }
        rutas, ok := dialogoAbrir(a.hwnd)
        if !ok || len(rutas) == 0 {
                return
        }
        a.anadirRutas(rutas)
}

// anadirRutas sondéa y añade rutas (compartido por diálogo y arrastre).
func (a *App) anadirRutas(rutas []string) {
        cursorEspera(true)
        defer cursorEspera(false)

        var añadidas, rechazadas int
        ultimoError := ""
        for _, ruta := range rutas {
                if len(a.pistas) >= config.MaxPistas {
                        ultimoError = fmt.Sprintf(i18n.MensajeDeError("TOO_MANY_TRACKS"), config.MaxPistas)
                        rechazadas++
                        continue
                }
                info, err := audio.Sondar(ruta)
                if err != nil {
                        rechazadas++
                        var e *audio.Error
                        if audio.AsError(err, &e) {
                                ultimoError = e.Mensaje
                        } else {
                                ultimoError = err.Error()
                        }
                        continue
                }
                a.pistas = append(a.pistas, infoPista{Info: info, Ok: true})
                añadidas++
        }
        a.refrescarLista()
        a.refrescarBotones()
        if añadidas > 0 {
                // Feedback visible de que se cargó: la última pista añadida
                // queda resaltada y con foco (Subir/Bajar activos al instante).
                a.desSeleccionarTodo()
                a.seleccionar(int32(len(a.pistas) - 1))
        }
        if rechazadas > 0 {
                setWindowText(a.hEstado, fmt.Sprintf(i18n.EstadoAnadidos, añadidas, rechazadas))
                messageBox(a.hwnd, fmt.Sprintf(i18n.TxtRechazados, rechazadas, ultimoError),
                        i18n.TituloError, MB_OK|MB_ICONWARNING)
        } else if añadidas > 0 {
                setWindowText(a.hEstado, i18n.EstadoListo)
        }
}

// dialogoAbrir ejecuta GetOpenFileNameW con multiselección.
func dialogoAbrir(owner uintptr) ([]string, bool) {
        buf := make([]uint16, config.BufferDialogoUTF16)
        buf[0] = 0
        filtro, _ := utf16FromString(i18n.FiltroAbrir)
        titulo, _ := utf16FromString(i18n.TituloAnadir)

        ofn := OPENFILENAMEW{
                LStructSize: uint32(unsafe.Sizeof(OPENFILENAMEW{})),
                HwndOwner:   owner,
                LpstrFilter: &filtro[0],
                LpstrFile:   &buf[0],
                NMaxFile:    uint32(len(buf)),
                LpstrTitle:  &titulo[0],
                Flags: OFN_ALLOWMULTISELECT | OFN_EXPLORER | OFN_FILEMUSTEXIST |
                        OFN_PATHMUSTEXIST | OFN_HIDEREADONLY | OFN_NOCHANGEDIR,
        }
        r, _, _ := comdlg32.NewProc("GetOpenFileNameW").Call(uintptr(unsafe.Pointer(&ofn)))
        if r == 0 {
                return nil, false
        }
        return rutasDeBuffer(buf), true
}

// dialogoGuardar ejecuta GetSaveFileNameW según el formato elegido.
func dialogoGuardar(owner uintptr, formato string) (string, bool) {
        var filtroTxt, defecto string
        switch formato {
        case "mp3":
                filtroTxt = i18n.FiltroMp3
                defecto = "mp3"
        default:
                filtroTxt = i18n.FiltroWav
                defecto = "wav"
        }
        buf := make([]uint16, 1024)
        // nombre por defecto: audio-fusionado.ext (i18n)
        nombre := fmt.Sprintf(i18n.NombreDefectoSalida, defecto)
        copy(buf, utf16.Encode([]rune(nombre)))

        filtro, _ := utf16FromString(filtroTxt)
        titulo, _ := utf16FromString(i18n.TituloGuardar)
        ext, _ := utf16FromString(defecto + "\x00")

        ofn := OPENFILENAMEW{
                LStructSize: uint32(unsafe.Sizeof(OPENFILENAMEW{})),
                HwndOwner:   owner,
                LpstrFilter: &filtro[0],
                LpstrFile:   &buf[0],
                NMaxFile:    uint32(len(buf)),
                LpstrTitle:  &titulo[0],
                LpstrDefExt: &ext[0],
                Flags:       OFN_OVERWRITEPROMPT | OFN_PATHMUSTEXIST | OFN_HIDEREADONLY | OFN_NOCHANGEDIR,
        }
        r, _, _ := comdlg32.NewProc("GetSaveFileNameW").Call(uintptr(unsafe.Pointer(&ofn)))
        if r == 0 {
                return "", false
        }
        s := cadenaUTF16(buf)
        if s == "" {
                return "", false
        }
        if strings.ToLower(filepath.Ext(s)) != "."+defecto {
                s += "." + defecto
        }
        return s, true
}

// utf16FromString convierte con terminador NUL incluido.
func utf16FromString(s string) ([]uint16, error) {
        return utf16.Encode([]rune(s + "\x00")), nil
}

// cadenaUTF16 extrae la primera cadena de un buffer UTF-16.
func cadenaUTF16(b []uint16) string {
        for i, v := range b {
                if v == 0 {
                        return string(utf16.Decode(b[:i]))
                }
        }
        return string(utf16.Decode(b))
}

// rutasDeBuffer interpreta el buffer multiselección de GetOpenFileNameW:
// una sola ruta, o directorio + nombres separados por NUL.
func rutasDeBuffer(b []uint16) []string {
        // corta al doble NUL final
        fin := len(b)
        for i := 0; i+1 < len(b); i++ {
                if b[i] == 0 && b[i+1] == 0 {
                        fin = i + 1
                        break
                }
        }
        b = b[:fin]
        partes := partirPorNUL(b)
        if len(partes) == 0 {
                return nil
        }
        if len(partes) == 1 {
                return []string{partes[0]}
        }
        dir := partes[0]
        var out []string
        for _, nombre := range partes[1:] {
                out = append(out, filepath.Join(dir, nombre))
        }
        return out
}

// partirPorNUL divide el buffer en cadenas no vacías.
func partirPorNUL(b []uint16) []string {
        var partes []string
        inicio := 0
        for i, v := range b {
                if v == 0 {
                        if i > inicio {
                                partes = append(partes, string(utf16.Decode(b[inicio:i])))
                        }
                        inicio = i + 1
                }
        }
        if inicio < len(b) {
                s := string(utf16.Decode(b[inicio:]))
                if s != "" {
                        partes = append(partes, s)
                }
        }
        return partes
}

// soltarArchivos procesa WM_DROPFILES.
func (a *App) soltarArchivos(hDrop uintptr) {
        if a.fusionando {
                procDragFinish.Call(hDrop)
                return
        }
        n, _, _ := procDragQueryFileW.Call(hDrop, 0xFFFFFFFF, 0, 0)
        var rutas []string
        for i := uintptr(0); i < n; i++ {
                largo, _, _ := procDragQueryFileW.Call(hDrop, i, 0, 0)
                if largo == 0 {
                        continue
                }
                buf := make([]uint16, largo+1)
                procDragQueryFileW.Call(hDrop, i, uintptr(unsafe.Pointer(&buf[0])), largo+1)
                rutas = append(rutas, cadenaUTF16(buf))
        }
        procDragFinish.Call(hDrop)
        if len(rutas) == 0 {
                return
        }
        a.anadirRutas(rutas)
}

// cursorEspera pone/quita el cursor de reloj de arena.
func cursorEspera(on bool) {
        id := uintptr(IDC_ARROW)
        if on {
                id = uintptr(IDC_WAIT)
        }
        c, _, _ := procLoadCursorW.Call(0, id)
        if c != 0 {
                procSetCursor.Call(c)
        }
}

// quitarSeleccion elimina las pistas seleccionadas.
func (a *App) quitarSeleccion() {
        if a.fusionando || a.arrastrando {
                return
        }
        sel := a.seleccionados()
        if len(sel) == 0 {
                return
        }
        // borra en orden inverso para no desplazar índices pendientes.
        for i := len(sel) - 1; i >= 0; i-- {
                idx := int(sel[i])
                if idx >= 0 && idx < len(a.pistas) {
                        a.pistas = append(a.pistas[:idx], a.pistas[idx+1:]...)
                }
        }
        a.refrescarLista()
        a.refrescarBotones()
}

// moverSeleccion desplaza el bloque seleccionado (-1 arriba, +1 abajo).
// Los índices cambian al ir intercambiando: se siguen MARCAS de posición,
// no los índices originales, para que el bloque (contiguo o no) se mueva
// como unidad y cada pista se desplace exactamente un hueco.
func (a *App) moverSeleccion(dir int) {
        if a.fusionando || a.arrastrando {
                return
        }
        sel := a.seleccionados()
        if len(sel) == 0 {
                return
        }
        n := len(a.pistas)
        marca := make([]bool, n)
        for _, s := range sel {
                if s >= 0 && int(s) < n {
                        marca[s] = true
                }
        }
        if dir < 0 {
                // ascendente: cada seleccionada sube si el hueco superior no es seleccionado
                for i := 1; i < n; i++ {
                        if marca[i] && !marca[i-1] {
                                a.pistas[i-1], a.pistas[i] = a.pistas[i], a.pistas[i-1]
                                marca[i-1], marca[i] = marca[i], marca[i-1]
                        }
                }
        } else {
                // descendente: cada seleccionada baja si el hueco inferior no es seleccionado
                for i := n - 2; i >= 0; i-- {
                        if marca[i] && !marca[i+1] {
                                a.pistas[i+1], a.pistas[i] = a.pistas[i], a.pistas[i+1]
                                marca[i+1], marca[i] = marca[i], marca[i+1]
                        }
                }
        }
        a.refrescarLista()
        // re-selecciona el bloque movido en su nueva posición
        for i, m := range marca {
                if m {
                        a.seleccionar(int32(i))
                }
        }
        a.refrescarBotones()
}

// vaciar limpia la lista tras confirmar.
func (a *App) vaciar() {
        if a.fusionando || a.arrastrando || len(a.pistas) == 0 {
                return
        }
        r := messageBox(a.hwnd, i18n.TxtVaciar, i18n.TituloVaciar, MB_YESNO|MB_ICONQUESTION)
        if r != IDYES {
                return
        }
        a.pistas = nil
        a.refrescarLista()
        a.refrescarBotones()
}
