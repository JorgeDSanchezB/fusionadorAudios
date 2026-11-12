//go:build windows

package gui

import (
        "context"
        "fmt"

        "fusionador/internal/audio"
        "fusionador/internal/i18n"
)

// formatoElegido devuelve "wav" o "mp3" según el combo.
func (a *App) formatoElegido() string {
        i := int32(sendMessage(a.hCombo, CB_GETCURSEL, 0, 0))
        if i == 1 {
                return "mp3"
        }
        return "wav"
}

// iniciarFusion valida, pide destino y lanza la goroutine de fusión.
func (a *App) iniciarFusion() {
        if a.fusionando || a.arrastrando {
                return
        }
        if len(a.pistas) < 2 {
                messageBox(a.hwnd, fmt.Sprintf(i18n.MensajeDeError("NO_TRACKS"), 2),
                        i18n.TituloError, MB_OK|MB_ICONWARNING)
                return
        }

        formato := a.formatoElegido()

        // aviso preventivo si MP3-copia no es aplicable con las pistas actuales.
        if formato == "mp3" {
                if mal := a.pistasIncompatiblesMp3(); mal > 0 {
                        messageBox(a.hwnd,
                                fmt.Sprintf(i18n.MsgMp3Requisito, fmt.Sprintf(i18n.MsgFormatoDistinto, mal)),
                                i18n.TituloError, MB_OK|MB_ICONWARNING)
                        return
                }
        }

        salida, ok := dialogoGuardar(a.hwnd, formato)
        if !ok || salida == "" {
                return
        }

        rutas := make([]string, len(a.pistas))
        for i, p := range a.pistas {
                rutas[i] = p.Ruta
        }

        ctx, cancel := context.WithCancel(context.Background())
        a.mu.Lock()
        a.fusionando = true
        a.cancelFunc = cancel
        a.resultado = nil
        a.salidaUlt = salida
        a.hecho = make(chan struct{})
        a.mu.Unlock()

        // UI en modo «trabajando».
        enableWindow(a.hAnadir, false)
        enableWindow(a.hQuitar, false)
        enableWindow(a.hSubir, false)
        enableWindow(a.hBajar, false)
        enableWindow(a.hVaciar, false)
        enableWindow(a.hLista, false)
        enableWindow(a.hCombo, false)
        enableWindow(a.hFusionar, false)
        enableWindow(a.hCancelar, true)
        setWindowText(a.hEstado, i18n.EstadoTrabajando)
        sendMessage(a.hProgreso, 0x406, 0, 1000) // PBM_SETRANGE32 0..1000
        sendMessage(a.hProgreso, 0x402, 0, 0)    // PBM_SETPOS 0

        opciones := audio.OpcionesFusion{FormatoSalida: formato}
        go func() {
                err := audio.Fusionar(ctx, rutas, salida, opciones, func(p audio.Progreso) {
                        postMessage(a.hwnd, msgProgreso, uintptr(uint32(p.Fraccion*1000)), 0)
                })
                a.mu.Lock()
                a.resultado = err
                close(a.hecho)
                a.mu.Unlock()
                postMessage(a.hwnd, msgFin, 0, 0)
        }()
}

// pistasIncompatiblesMp3 cuenta pistas que rompen el modo copia.
func (a *App) pistasIncompatiblesMp3() int {
        if len(a.pistas) == 0 {
                return 0
        }
        ref := a.pistas[0]
        if ref.Formato != "mp3" {
                return len(a.pistas)
        }
        mal := 0
        for _, p := range a.pistas {
                if p.Formato != "mp3" || p.Tasa != ref.Tasa || p.Canales != ref.Canales {
                        mal++
                }
        }
        return mal
}

// cancelarFusion aborta la fusión en curso.
func (a *App) cancelarFusion() {
        a.mu.Lock()
        cancel := a.cancelFunc
        a.mu.Unlock()
        if cancel != nil {
                cancel()
                setWindowText(a.hEstado, fmt.Sprintf(i18n.EstadoCancelando, i18n.EstadoTrabajando))
        }
}

// actualizarProgreso recibe el avance del worker (0..1000).
func (a *App) actualizarProgreso(miles uint32) {
        sendMessage(a.hProgreso, 0x402, uintptr(uint32(miles)), 0) // PBM_SETPOS
}

// finFusion procesa el mensaje de finalización del worker.
func (a *App) finFusion() {
        a.mu.Lock()
        err := a.resultado
        salida := a.salidaUlt
        a.fusionando = false
        a.cancelFunc = nil
        a.mu.Unlock()

        // UI de vuelta al modo normal.
        enableWindow(a.hCancelar, false)
        a.refrescarBotones()
        sendMessage(a.hProgreso, 0x402, 0, 0)

        switch {
        case err == nil:
                setWindowText(a.hEstado, fmt.Sprintf(i18n.EstadoHecho, salida))
                messageBox(a.hwnd, fmt.Sprintf(i18n.TxtHecho, salida), i18n.TituloHecho,
                        MB_OK|MB_ICONINFORMATION)
        case audio.DeCodigo(err, audio.CodigoUserCancelled):
                setWindowText(a.hEstado, i18n.TxtCancelado)
                messageBox(a.hwnd, i18n.TxtCancelado, i18n.TituloCancelado, MB_OK|MB_ICONINFORMATION)
        default:
                setWindowText(a.hEstado, i18n.EstadoListo)
                texto := ""
                var e *audio.Error
                if audio.AsError(err, &e) {
                        texto = e.Mensaje
                } else {
                        texto = err.Error()
                }
                messageBox(a.hwnd, texto, i18n.TituloError, MB_OK|MB_ICONERROR)
        }
}

// esperarWorker bloquea hasta que la goroutine de fusión termine (salida).
func (a *App) esperarWorker() {
        a.mu.Lock()
        ch := a.hecho
        a.mu.Unlock()
        if ch != nil {
                <-ch
        }
}
