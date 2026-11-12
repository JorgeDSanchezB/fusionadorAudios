//go:build windows

// Fusionador de Audio: une varios audios en uno, todo en local.
// Ejecutable nativo Windows x64 (D-01/D-02).
package main

import (
        "os"
        "runtime"

        "fusionador/internal/gui"
)

func main() {
        // Win32 exige afinidad de hilo: la ventana, su cola de mensajes y el
        // bucle deben vivir en el MISMO hilo del SO durante toda la vida del
        // proceso. Sin esto, el scheduler de Go puede migrar la goroutine del
        // bucle a otro hilo tras un syscall bloqueante (p. ej. el diálogo modal
        // de archivos) y la GUI se congela para siempre (bug real de la 1.0.0,
        // ver D-16).
        runtime.LockOSThread()
        if err := gui.Ejecutar(); err != nil {
                os.Exit(1)
        }
}
