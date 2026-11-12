// Package i18n contiene TODOS los textos visibles de la herramienta, en
// castellano. Ningún literal de UI vive fuera de aquí (los literales del
// instalador NSIS viven en installer/audio-merger.nsi, su único ámbito).
package i18n

import (
        "fmt"
        "strings"
)

// Errores devuelve el mensaje de usuario para cada código del motor.
// fmt.Sprintf con los argumentos que aporte el motor.
var errores = map[string]string{
        "UNSUPPORTED_FORMAT": "El archivo «%s» no es un audio admitido (WAV, MP3, OGG o FLAC). Conviértelo antes a uno de esos formatos.",
        "FILE_TOO_LARGE":     "El archivo «%s» supera el límite de %s por archivo.",
        "TOO_MANY_TRACKS":    "No se pueden añadir más de %d pistas.",
        "TOTAL_TOO_LARGE":    "El total de entrada supera el límite de %s.",
        "READ_FAILED":        "No se pudo leer «%s».",
        "DECODE_FAILED":      "«%s» parece dañado o usa una variante que no se pudo decodificar.",
        "PARAM_MISMATCH":     "%s",
        "NO_TRACKS":          "Añade al menos %d pistas antes de fusionar.",
        "INVALID_ORDER":      "El orden de pistas no es válido.",
        "INVALID_OPTIONS":    "%s",
        "USER_CANCELLED":     "Fusión cancelada.",
        "WRITE_FAILED":       "No se pudo escribir «%s»: %v",
        "UNKNOWN_ERROR":      "Error inesperado: %v",
}

// MensajeDeError devuelve el texto de usuario para un código.
func MensajeDeError(codigo string) string {
        if m, ok := errores[codigo]; ok {
                return m
        }
        return fmt.Sprintf(errores["UNKNOWN_ERROR"], codigo)
}

// GUI: ventana y controles.
const (
        TituloVentana = "Fusionador de Audio — unir audios en uno"

        BotonAnadir   = "&Añadir audios…"
        BotonQuitar   = "&Quitar"
        BotonSubir    = "Su&bir"
        BotonBajar    = "&Bajar"
        BotonVaciar   = "&Vaciar lista"
        BotonFusionar = "&Fusionar…"
        BotonCancelar = "Cancelar"

        EtiquetaFormatoSalida = "Formato de salida:"

        OpcionWav = "WAV (PCM 16 bits)"
        OpcionMp3 = "MP3 (copia, sin recodificar)"

        ColNum     = "#"
        ColNombre  = "Nombre"
        ColFormato = "Formato"
        ColDur     = "Duración"
        ColInfo    = "Info"

        HintArrastra = "Arrastra archivos de audio aquí, o pulsa «Añadir audios». Se procesa todo en tu equipo: nada se sube a internet."
        HintVacia    = "No hay pistas todavía."
        HintOrden    = "la fusión sigue ESTE orden: reordena con «Subir»/«Bajar» (Alt+↑/↓) o arrastrando las pistas."

        EstadoListo      = "Listo."
        EstadoTrabajando = "Fusionando… puedes cancelar."
        EstadoHecho      = "Fusión completada: %s"

        MenuArchivo  = "&Archivo"
        MenuAyuda    = "A&yuda"
        MenuAnadir   = "&Añadir audios…\tCtrl+A"
        MenuFusionar = "&Fusionar…\tCtrl+M"
        MenuSalir    = "&Salir"
        MenuAcerca   = "&Acerca de…\tF1"

        TituloAnadir  = "Añadir audios"
        TituloGuardar = "Guardar audio fusionado"
        FiltroAbrir   = "Audios admitidos (*.wav;*.mp3;*.ogg;*.flac)\x00*.wav;*.mp3;*.ogg;*.flac\x00Todos los archivos (*.*)\x00*.*\x00"
        FiltroWav     = "Audio WAV (*.wav)\x00*.wav\x00"
        FiltroMp3     = "Audio MP3 (*.mp3)\x00*.mp3\x00"

        TituloHecho     = "Fusión completada"
        TxtHecho        = "¡Listo! El audio fusionado se guardó en:\n%s"
        TituloError     = "No se pudo fusionar"
        TituloCancelado = "Cancelado"
        TxtCancelado    = "Has cancelado la fusión. No se guardó ningún archivo."

        TituloSalirDuranteFusion = "Fusión en curso"
        TxtSalirDuranteFusion    = "Hay una fusión en curso. ¿Cancelarla y salir?"
        TituloVaciar             = "Vaciar lista"
        TxtVaciar                = "¿Quitar todas las pistas de la lista?"

        TituloAcerca = "Acerca del Fusionador de Audio"
        TxtAcerca    = "Fusionador de Audio %s\n\nUne varios audios en uno, en el orden que tú elijas, sin subir nada a internet.\n\nEntradas: WAV, MP3, OGG (Vorbis) y FLAC.\nSalidas: WAV (PCM 16 bits) y MP3 en modo copia (mismo formato en todas las pistas).\n\nLicencia MIT · decodificadores: go-mp3 (Apache-2.0), oggvorbis (MIT), flac (Unlicense).\nSe procesa todo en tu equipo."

        MenuCtxQuitar = "Quitar\tSupr"
        MenuCtxSubir  = "Subir\tAlt+↑"
        MenuCtxBajar  = "Bajar\tAlt+↓"

        ErrorAbrirMulti  = "No se pudo abrir el diálogo de archivos (código %d)."
        ErrorGuardarDlg  = "No se pudo abrir el diálogo de guardar."
        ExtesionInvalida = "«%s»: %s"
)

// Mensajes del motor (no asociados a código de error).
const (
        MsgMp3Requisito    = "La salida MP3 en modo copia necesita que TODAS las pistas sean MP3 con la misma tasa de muestreo y modo de canal. Ahora hay: %s"
        MsgSinPistasMp3    = "no hay pistas"
        MsgFormatoDistinto = "%d pistas no son MP3 o difieren en tasa/canales"
)

// FormatoDuracion formatea segundos como m:ss o h:mm:ss; bajo 1 minuto
// muestra décimas con coma castellana.
func FormatoDuracion(seg float64) string {
        if seg < 0 {
                seg = 0
        }
        if seg < 60 {
                return strings.Replace(fmt.Sprintf("%.1f s", seg), ".", ",", 1)
        }
        total := int(seg + 0.5)
        m, s := total/60, total%60
        if m < 60 {
                return fmt.Sprintf("%d:%02d", m, s)
        }
        h, m := m/60, m%60
        return fmt.Sprintf("%d:%02d:%02d", h, m, s)
}

// FormatoTamanyo formatea bytes con coma decimal castellana.
func FormatoTamanyo(b int64) string {
        const k = 1 << 10
        switch {
        case b >= 10*k*k:
                return fmt.Sprintf("%d MB", b/(k*k))
        case b >= k*k:
                entero := b / (k * k)
                dec := (b % (k * k)) * 10 / (k * k)
                return fmt.Sprintf("%d,%d MB", entero, dec)
        case b >= 10*k:
                return fmt.Sprintf("%d KB", b/k)
        default:
                return fmt.Sprintf("%d B", b)
        }
}

// FormatoTasa formatea hercios con coma decimal castellana (44,1 kHz).
func FormatoTasa(hz int) string {
        if hz%1000 == 0 {
                return fmt.Sprintf("%d kHz", hz/1000)
        }
        return fmt.Sprintf("%d,%d kHz", hz/1000, (hz%1000)/100)
}

// DescripcionCanales devuelve «mono»/«estéreo»/«N canales».
func DescripcionCanales(n int) string {
        switch n {
        case 1:
                return "mono"
        case 2:
                return "estéreo"
        default:
                return fmt.Sprintf("%d canales", n)
        }
}

// Literales añadidos tras la auditoría (centralización completa, D-12).
const (
        EstadoNPistas   = "%d pista(s) — %s"
        EstadoAnadidos  = "%d añadida(s), %d rechazada(s)"
        TxtRechazados   = "%d archivo(s) no se pudieron añadir.\n\nÚltimo motivo: %s"
        EstadoCancelando = "%s (cancelando…)"
        NombreDefectoSalida = "audio-fusionado.%s"
)
