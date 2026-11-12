// Package config centraliza TODOS los límites, formatos y constantes de la
// herramienta. Cero literales mágicos repartidos por el código (misma filosofía
// que la librería web del proyecto).
package config

import "fmt"

// Valores por defecto. Única fuente de verdad.
const (
        // Límites de entrada.
        MaxPistas        = 500       // máx. pistas por fusión (paridad con la web).
        MaxBytesPorPista = 512 << 20 // 512 MiB por archivo.
        MaxBytesTotales  = 2 << 30   // 2 GiB de entrada en total.

        // Salida WAV.
        BitsWavSalida = 16 // PCM int16 (estándar universal).

        // Buffers de E/S.
        BufferLecturaBytes = 64 << 10 // 64 KiB por lectura de decodificación.
        MuestrasPorBloque  = 8192     // muestras por canal y bloque de conversión.

        // Diálogo de apertura: tamaño del buffer multiselección (UTF-16).
        BufferDialogoUTF16 = 32768

        // Duración mostrada: precisión.
        PrecisionDuracionMS = 100
)

// FormatoID identifica un formato de audio soportado.
type FormatoID string

// Formatos de entrada soportados (orden = orden de sondeo por extensión).
var FormatosEntrada = []FormatoID{"wav", "mp3", "ogg", "flac"}

// Formatos de salida soportados.
var FormatosSalida = []FormatoID{"wav", "mp3"}

// ExtensionesAceptadas lista extensiones aceptadas por el diálogo de archivos.
var ExtensionesAceptadas = []string{".wav", ".mp3", ".ogg", ".flac"}

// Version de la herramienta.
const Version = "1.0.3"

// NombreProducto es el nombre visible del producto.
const NombreProducto = "Fusionador de Audio"

// Validar comprueba invariantes del paquete al arrancar; pánico si están rotos
// (un fallo aquí es un bug de programación, no de usuario).
func Validar() error {
        if MaxPistas < 2 {
                return fmt.Errorf("config: MaxPistas debe ser >= 2, es %d", MaxPistas)
        }
        if MaxBytesPorPista <= 0 || MaxBytesTotales < MaxBytesPorPista {
                return fmt.Errorf("config: límites de tamaño incoherentes (%d/%d)", MaxBytesPorPista, MaxBytesTotales)
        }
        if BitsWavSalida != 16 {
                return fmt.Errorf("config: BitsWavSalida soportado: 16 (es %d)", BitsWavSalida)
        }
        if len(FormatosSalida) == 0 || len(FormatosEntrada) == 0 {
                return fmt.Errorf("config: sin formatos registrados")
        }
        for _, f := range FormatosSalida {
                if f != "wav" && f != "mp3" {
                        return fmt.Errorf("config: formato de salida desconocido %q", f)
                }
        }
        return nil
}
