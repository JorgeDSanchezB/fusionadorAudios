//go:build windows

package gui

import (
        "unsafe"
)

// Reordenación por arrastre DENTRO de la lista (D-18). El arrastre DE
// ARCHIVOS desde el Explorador es aparte (WM_DROPFILES) y sigue igual.
//
// Patrón clásico Win32 sin OLE ni ImageList_Drag ni subclases: el ListView
// avisa con LVN_BEGINDRAG al padre; el padre roba el capturador del ratón
// (SetCapture) y a partir de ahí TODOS los mensajes de ratón llegan a su
// propio wndProc: WM_MOUSEMOVE pinta la marca de inserción (LVM_SETINSERTMARK)
// y WM_LBUTTONUP reordena. Si algo externo roba el capturador, llega
// WM_CAPTURECHANGED y se cancela limpio. Los botones «Subir»/«Bajar» siguen
// siendo la vía garantizada y accesible por teclado (D-09 no se deroga).

// iniciarArrastre arranca el arrastre de la pista i (LVN_BEGINDRAG).
func (a *App) iniciarArrastre(i int32) {
        if a.fusionando || a.arrastrando {
                return
        }
        if i < 0 || int(i) >= len(a.pistas) || len(a.pistas) < 2 {
                return // nada que reordenar
        }
        a.arrastrando = true
        a.dragOrigen = i
        a.dragDestino = i
        procSetCapture.Call(a.hwnd)
        a.moverArrastre()
}

// moverArrastre recoloca la marca de inserción bajo el cursor.
func (a *App) moverArrastre() {
        var pt POINT
        procGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
        procScreenToClient.Call(a.hLista, uintptr(unsafe.Pointer(&pt)))
        a.dragDestino = a.posicionInsercion(pt)
        a.ponerMarca(a.marcaPara(a.dragDestino))
}

// soltarArrastre reordena la pista arrastrada en el punto de inserción.
func (a *App) soltarArrastre() {
        if !a.arrastrando {
                return
        }
        a.arrastrando = false
        procReleaseCapture.Call()
        a.ponerMarca(LVINSERTMARK{IItem: -1}) // quita la marca

        origen := int(a.dragOrigen)
        destino := int(a.dragDestino)
        n := len(a.pistas)
        if origen < 0 || origen >= n || destino < 0 || destino > n {
                a.refrescarBotones()
                return
        }
        if destino == origen || destino == origen+1 {
                // no-op: deja la pista arrastrada visible y seleccionada
                a.desSeleccionarTodo()
                a.seleccionar(int32(origen))
                a.refrescarBotones()
                return
        }
        pos := destino
        if pos > origen {
                pos-- // quitar la propia pista desplaza el punto de inserción
        }
        pista := a.pistas[origen]
        nueva := make([]infoPista, 0, n)
        nueva = append(nueva, a.pistas[:origen]...)
        nueva = append(nueva, a.pistas[origen+1:]...)
        nueva = append(nueva, infoPista{}) // hueco
        copy(nueva[pos+1:], nueva[pos:])
        nueva[pos] = pista
        a.pistas = nueva

        a.refrescarLista()
        a.desSeleccionarTodo()
        a.seleccionar(int32(pos))
        a.refrescarBotones()
}

// cancelarArrastre aborta el arrastre (capturador perdido, etc.).
func (a *App) cancelarArrastre() {
        if !a.arrastrando {
                return
        }
        a.arrastrando = false
        a.ponerMarca(LVINSERTMARK{IItem: -1})
        a.refrescarBotones()
}

// posicionInsercion traduce un punto (coords cliente de la lista) al índice
// de inserción 0..n: golpe de fila + mitad inferior → después de esa fila;
// fuera de cualquier fila → al final.
func (a *App) posicionInsercion(pt POINT) int32 {
        n := int32(len(a.pistas))
        ht := LVHITTESTINFO{Pt: pt}
        fila := int32(sendMessage(a.hLista, LVM_HITTEST, 0, uintptr(unsafe.Pointer(&ht))))
        if fila < 0 {
                return n
        }
        var rc RECT
        rc.Left = LVIR_BOUNDS
        if sendMessage(a.hLista, LVM_GETITEMRECT, uintptr(uint32(fila)), uintptr(unsafe.Pointer(&rc))) != 0 {
                if pt.Y >= (rc.Top+rc.Bottom)/2 {
                        return fila + 1
                }
        }
        return fila
}

// marcaPara construye la LVINSERTMARK que visualiza el índice de inserción
// (marca neutra si el arrastre sería un no-op). CbSize lo rellena ponerMarca.
func (a *App) marcaPara(destino int32) LVINSERTMARK {
        n := int32(len(a.pistas))
        if destino == a.dragOrigen || destino == a.dragOrigen+1 {
                return LVINSERTMARK{IItem: -1} // soltar aquí no cambia nada
        }
        if destino <= 0 {
                return LVINSERTMARK{DwFlags: 0, IItem: 0}
        }
        if destino >= n {
                return LVINSERTMARK{DwFlags: LVIM_AFTER, IItem: n - 1}
        }
        return LVINSERTMARK{DwFlags: 0, IItem: destino}
}

// ponerMarca fija (o borra, IItem -1) la marca de inserción de la lista.
// Rellena CbSize (sin él, LVM_SETINSERTMARK devuelve FALSE y no pinta nada).
// Requiere comctl32 v6 (el manifiesto la activa); si no estuviera, degrada sin
// guía visual y el arrastre funciona igual.
func (a *App) ponerMarca(m LVINSERTMARK) {
        m.CbSize = uint32(unsafe.Sizeof(LVINSERTMARK{}))
        m.DwReserved = 0
        sendMessage(a.hLista, LVM_SETINSERTMARK, 0, uintptr(unsafe.Pointer(&m)))
}
