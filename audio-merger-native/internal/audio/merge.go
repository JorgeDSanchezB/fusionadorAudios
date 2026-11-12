package audio

// Fusión: el núcleo de la herramienta. Dos rutas (D-05/D-06):
//   - WAV: decodifica cada entrada a float32, normaliza a la tasa/canales de
//     la PRIMERA pista y escribe PCM16 en streaming (memoria O(1) por pista).
//   - MP3 (copia): exige entradas MP3 homogéneas y concatena frames crudos,
//     eliminando los tags ID3 de origen.
// Escritura atómica: temporal + rename (D-13). Cancelación por contexto.

import (
        "context"
        "fmt"
        "io"
        "os"
        "path/filepath"

        "fusionador/internal/config"
        "fusionador/internal/i18n"
)

// OpcionesFusion de la fusión.
type OpcionesFusion struct {
        FormatoSalida string // "wav" | "mp3"
}

// Progreso reporta el avance (fracción 0..1) y la pista en curso.
type Progreso struct {
        Fraccion    float64
        Pista       int // índice 0-based
        TotalPistas int
        Ruta        string
}

// Fusionar une las rutas (en orden) y escribe el resultado en salida.
// onProgreso se llama desde la goroutine de trabajo (la GUI debe serializar).
func Fusionar(ctx context.Context, rutas []string, salida string, opts OpcionesFusion, onProgreso func(Progreso)) error {
        // Validaciones estructurales.
        minPistas := 2
        if len(rutas) < minPistas {
                return &Error{Codigo: CodigoNoTracks, Mensaje: fmt.Sprintf(i18n.MensajeDeError("NO_TRACKS"), minPistas)}
        }
        switch opts.FormatoSalida {
        case "wav":
                return fusionarWAV(ctx, rutas, salida, onProgreso)
        case "mp3":
                return fusionarMP3Copia(ctx, rutas, salida, onProgreso)
        default:
                return &Error{
                        Codigo:  CodigoInvalidOptions,
                        Mensaje: fmt.Sprintf(i18n.MensajeDeError("INVALID_OPTIONS"), fmt.Sprintf("formato de salida desconocido: %q", opts.FormatoSalida)),
                }
        }
}

// checkLimites valida cantidad y tamaños contra config.
func checkLimites(rutas []string) error {
        if len(rutas) > config.MaxPistas {
                return &Error{Codigo: CodigoTooManyTracks, Mensaje: fmt.Sprintf(i18n.MensajeDeError("TOO_MANY_TRACKS"), config.MaxPistas)}
        }
        var total int64
        for _, r := range rutas {
                st, err := os.Stat(r)
                if err != nil {
                        return &Error{Codigo: CodigoReadFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("READ_FAILED"), r), Causa: err}
                }
                if st.Size() > config.MaxBytesPorPista {
                        return &Error{Codigo: CodigoFileTooLarge, Mensaje: fmt.Sprintf(i18n.MensajeDeError("FILE_TOO_LARGE"), filepath.Base(r), i18n.FormatoTamanyo(config.MaxBytesPorPista))}
                }
                total += st.Size()
        }
        if total > config.MaxBytesTotales {
                return &Error{Codigo: CodigoTotalTooLarge, Mensaje: fmt.Sprintf(i18n.MensajeDeError("TOTAL_TOO_LARGE"), i18n.FormatoTamanyo(config.MaxBytesTotales))}
        }
        return nil
}

// tamanyos devuelve el tamaño de cada ruta (para ponderar progreso).
func tamanyos(rutas []string) ([]int64, int64, error) {
        tams := make([]int64, len(rutas))
        var total int64
        for i, r := range rutas {
                st, err := os.Stat(r)
                if err != nil {
                        return nil, 0, err
                }
                tams[i] = st.Size()
                total += st.Size()
        }
        return tams, total, nil
}

// cancelado comprueba el contexto y devuelve el error tipado de cancelación.
func cancelado(ctx context.Context) bool {
        select {
        case <-ctx.Done():
                return true
        default:
                return false
        }
}

// temporal crea la ruta temporal junto al destino (misma unidad → rename barato).
func temporal(destino string) string {
        ext := filepath.Ext(destino)
        base := destino[:len(destino)-len(ext)]
        return base + ".fusionando" + ext + ".tmp"
}

// fusionarWAV implementa la salida WAV con normalización streaming.
func fusionarWAV(ctx context.Context, rutas []string, salida string, onProgreso func(Progreso)) error {
        if err := checkLimites(rutas); err != nil {
                return err
        }
        tams, total, err := tamanyos(rutas)
        if err != nil {
                return &Error{Codigo: CodigoReadFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("READ_FAILED"), filepath.Base(err.Error())), Causa: err}
        }

        // Sonda de la primera pista para fijar el destino.
        var d0 Decodificador
        {
                f0, errFmt := DetectarFormato(rutas[0])
                if errFmt != nil {
                        return errFmt
                }
                d0, err = AbrirDecodificador(f0, rutas[0])
                if err != nil {
                        return err
                }
        }
        tasaDst, canalesDst := d0.Params()
        d0.Cerrar()
        if tasaDst <= 0 || canalesDst <= 0 {
                return nuevoError(CodigoDecodeFailed, "la primera pista no declara parámetros válidos")
        }

        rutaTmp := temporal(salida)
        fOut, err := os.Create(rutaTmp)
        if err != nil {
                return &Error{Codigo: CodigoWriteFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("WRITE_FAILED"), salida, "no se pudo crear el archivo temporal"), Causa: err}
        }
        esc := NuevoEscritorWavSafe(fOut, tasaDst, canalesDst)

        var procesados int64
        defer func() {
                fOut.Close()
                if esc.fallo || !esc.cerrado {
                        os.Remove(rutaTmp)
                }
        }()

        for i, ruta := range rutas {
                formato, errF := DetectarFormato(ruta)
                if errF != nil {
                        return errF
                }
                // go-mp3 traga los MP3 truncados como EOF silencioso: validar antes.
                if formato == "mp3" {
                        if err := validarMp3(ruta); err != nil {
                                return err
                        }
                }
                dec, errA := AbrirDecodificador(formato, ruta)
                if errA != nil {
                        return errA
                }
                tasaSrc, canalesSrc := dec.Params()
                conv, errC := NewConversor(tasaSrc, canalesSrc, tasaDst, canalesDst)
                if errC != nil {
                        dec.Cerrar()
                        return Clasifica(CodigoInvalidOptions, errC, "parámetros de %s no convertibles", filepath.Base(ruta))
                }

                tamPista := tams[i]
                buf := make([]float32, config.MuestrasPorBloque*canalesSrc)
                var leidosPista int64
                for {
                        if cancelado(ctx) {
                                dec.Cerrar()
                                return &Error{Codigo: CodigoUserCancelled, Mensaje: i18n.MensajeDeError("USER_CANCELLED")}
                        }
                        n, errL := dec.Leer(buf)
                        if n > 0 {
                                out := conv.Procesar(buf[:n])
                                if errW := esc.EscribirPCM(out); errW != nil {
                                        dec.Cerrar()
                                        return errW
                                }
                                leidosPista += int64(n) * int64(canalesSrc)
                                if onProgreso != nil && total > 0 {
                                        onProgreso(Progreso{
                                                Fraccion:    float64(procesados+min64(leidosPista*2, tamPista)) / float64(total),
                                                Pista:       i,
                                                TotalPistas: len(rutas),
                                                Ruta:        filepath.Base(ruta),
                                        })
                                }
                        }
                        if errL == io.EOF {
                                break
                        }
                        if errL != nil {
                                dec.Cerrar()
                                return errL
                        }
                }
                if cola := conv.Fin(); len(cola) > 0 {
                        if errW := esc.EscribirPCM(cola); errW != nil {
                                dec.Cerrar()
                                return errW
                        }
                }
                dec.Cerrar()
                procesados += tamPista
                if onProgreso != nil {
                        onProgreso(Progreso{Fraccion: float64(procesados) / float64(total), Pista: i, TotalPistas: len(rutas), Ruta: filepath.Base(ruta)})
                }
        }

        if err := esc.Cerrar(); err != nil {
                return err
        }
        if err := fOut.Sync(); err != nil {
                return &Error{Codigo: CodigoWriteFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("WRITE_FAILED"), salida, "sync falló"), Causa: err}
        }
        fOut.Close()
        if err := os.Rename(rutaTmp, salida); err != nil {
                os.Remove(rutaTmp)
                return &Error{Codigo: CodigoWriteFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("WRITE_FAILED"), salida, "no se pudo renombrar el temporal"), Causa: err}
        }
        return nil
}

// EscritorWavSafe envuelve EscritorWav marcando fallos para el defer.
type escritorSeguro struct {
        *EscritorWav
        fallo   bool
        cerrado bool
}

func NuevoEscritorWavSafe(w io.WriteSeeker, tasa, canales int) *escritorSeguro {
        e, err := NuevoEscritorWav(w, tasa, canales)
        if err != nil {
                return &escritorSeguro{fallo: true}
        }
        return &escritorSeguro{EscritorWav: e}
}

func (e *escritorSeguro) EscribirPCM(m []float32) error {
        if err := e.EscritorWav.EscribirPCM(m); err != nil {
                e.fallo = true
                return err
        }
        return nil
}

func (e *escritorSeguro) Cerrar() error {
        e.cerrado = true
        if err := e.EscritorWav.Cerrar(); err != nil {
                e.fallo = true
                return err
        }
        return nil
}

// validarMp3 recorre las cabeceras del MP3 completo: detecta frames
// truncados o inválidos que go-mp3 convierte en EOF silencioso.
func validarMp3(ruta string) error {
        e, err := NuevoEscanerMP3(ruta)
        if err != nil {
                return err
        }
        defer e.Cerrar()
        for {
                ok, err := e.Siguiente()
                if err != nil {
                        return err
                }
                if !ok {
                        return nil
                }
        }
}

// fusionarMP3Copia implementa la salida MP3 en modo copia (D-05).
func fusionarMP3Copia(ctx context.Context, rutas []string, salida string, onProgreso func(Progreso)) error {
        if err := checkLimites(rutas); err != nil {
                return err
        }

        // Homogeneidad: misma versión MPEG, tasa y canales en TODAS.
        infos := make([]Info, len(rutas))
        for i, r := range rutas {
                info, err := Sondar(r)
                if err != nil {
                        return err
                }
                if info.Formato != "mp3" {
                        return &Error{
                                Codigo:  CodigoParamMismatch,
                                Mensaje: fmt.Sprintf(i18n.MsgMp3Requisito, fmt.Sprintf(i18n.ExtesionInvalida, filepath.Base(r), "no es MP3")),
                        }
                }
                if i > 0 && (info.Tasa != infos[0].Tasa || info.Canales != infos[0].Canales) {
                        det := fmt.Sprintf("«%s» va a %d Hz · %d canales y «%s» a %d Hz · %d canales",
                                filepath.Base(rutas[0]), infos[0].Tasa, infos[0].Canales,
                                filepath.Base(r), info.Tasa, info.Canales)
                        return &Error{Codigo: CodigoParamMismatch, Mensaje: fmt.Sprintf(i18n.MsgMp3Requisito, det)}
                }
                infos[i] = info
        }

        tams, total, _ := tamanyos(rutas)

        rutaTmp := temporal(salida)
        fOut, err := os.Create(rutaTmp)
        if err != nil {
                return &Error{Codigo: CodigoWriteFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("WRITE_FAILED"), salida, "no se pudo crear el archivo temporal"), Causa: err}
        }
        ok := false
        defer func() {
                fOut.Close()
                if !ok {
                        os.Remove(rutaTmp)
                }
        }()

        buf := make([]byte, config.BufferLecturaBytes)
        var procesados int64
        for i, ruta := range rutas {
                fIn, errA := os.Open(ruta)
                if errA != nil {
                        return &Error{Codigo: CodigoReadFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("READ_FAILED"), ruta), Causa: errA}
                }
                // Saltar ID3v2.
                var cab [10]byte
                if _, errR := io.ReadFull(fIn, cab[:]); errR != nil {
                        fIn.Close()
                        return nuevoError(CodigoDecodeFailed, "MP3 ilegible al inicio: %s", filepath.Base(ruta)).conCausa(errR)
                }
                off := saltarID3(cab[:])
                if _, errS := fIn.Seek(int64(off), io.SeekStart); errS != nil {
                        fIn.Close()
                        return nuevoError(CodigoReadFailed, "seek falló en %s", ruta).conCausa(errS)
                }
                // Copiar frame a frame validando cabeceras.
                var leidos int64
                for {
                        if cancelado(ctx) {
                                fIn.Close()
                                return &Error{Codigo: CodigoUserCancelled, Mensaje: i18n.MensajeDeError("USER_CANCELLED")}
                        }
                        var fh [4]byte
                        nH, errH := io.ReadFull(fIn, fh[:])
                        if errH == io.EOF {
                                break
                        }
                        if errH == io.ErrUnexpectedEOF && nH == 0 {
                                break
                        }
                        if errH != nil {
                                fIn.Close()
                                return nuevoError(CodigoReadFailed, "lectura MP3 falló en %s", ruta).conCausa(errH)
                        }
                        h, okH := parseHeaderMP3(fh[:])
                        if !okH {
                                // D2 (árbitro): cola corta final de basura o tag ID3v1
                                // («TAG» + 124 bytes) se tolera, como en el escáner.
                                if tams[i]-int64(off)-leidos <= 4096+4 {
                                        break
                                }
                                fIn.Close()
                                return nuevoError(CodigoDecodeFailed, "frame MP3 inválido en %s (byte %d)", filepath.Base(ruta), leidos)
                        }
                        // escribe cabecera + resto del frame, SALVO frames de metadatos
                        // Xing/Info/VBRI (no llevan audio; D-05: se descartan para que la
                        // salida no herede duraciones falsas ni tags de origen).
                        resto := h.Longitud - 4
                        if resto > 0 {
                                if resto > len(buf) {
                                        buf = make([]byte, resto)
                                }
                                nC, errC := io.ReadFull(fIn, buf[:resto])
                                if errC != nil {
                                        fIn.Close()
                                        return nuevoError(CodigoDecodeFailed, "frame MP3 truncado en %s", filepath.Base(ruta)).conCausa(errC)
                                }
                                if !esFrameMetadatosMP3(buf[:nC]) {
                                        if _, errW := fOut.Write(fh[:]); errW != nil {
                                                fIn.Close()
                                                return &Error{Codigo: CodigoWriteFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("WRITE_FAILED"), salida, "escritura falló"), Causa: errW}
                                        }
                                        if _, errW := fOut.Write(buf[:nC]); errW != nil {
                                                fIn.Close()
                                                return &Error{Codigo: CodigoWriteFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("WRITE_FAILED"), salida, "escritura falló"), Causa: errW}
                                        }
                                }
                        } else {
                                if _, errW := fOut.Write(fh[:]); errW != nil {
                                        fIn.Close()
                                        return &Error{Codigo: CodigoWriteFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("WRITE_FAILED"), salida, "escritura falló"), Causa: errW}
                                }
                        }
                        leidos += int64(h.Longitud)
                        if onProgreso != nil && total > 0 {
                                onProgreso(Progreso{
                                        Fraccion:    float64(procesados+min64(leidos+int64(off), tams[i])) / float64(total),
                                        Pista:       i,
                                        TotalPistas: len(rutas),
                                        Ruta:        filepath.Base(ruta),
                                })
                        }
                }
                fIn.Close()
                procesados += tams[i]
                if onProgreso != nil {
                        onProgreso(Progreso{Fraccion: float64(procesados) / float64(total), Pista: i, TotalPistas: len(rutas), Ruta: filepath.Base(ruta)})
                }
        }

        if err := fOut.Sync(); err != nil {
                return &Error{Codigo: CodigoWriteFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("WRITE_FAILED"), salida, "sync falló"), Causa: err}
        }
        fOut.Close()
        if err := os.Rename(rutaTmp, salida); err != nil {
                os.Remove(rutaTmp)
                return &Error{Codigo: CodigoWriteFailed, Mensaje: fmt.Sprintf(i18n.MensajeDeError("WRITE_FAILED"), salida, "no se pudo renombrar el temporal"), Causa: err}
        }
        ok = true
        return nil
}

func min64(a, b int64) int64 {
        if a < b {
                return a
        }
        return b
}

// esFrameMetadatosMP3 detecta frames Xing/Info/VBRI (sin audio) buscando la
// firma tras el side info (ventana 4..64 del frame completo).
func esFrameMetadatosMP3(resto []byte) bool {
        // resto = frame sin la cabecera de 4 bytes; firmas en offset ~28..40.
        if len(resto) < 48 {
                return false
        }
        ventana := resto[:48]
        for _, firma := range []string{"Xing", "Info", "VBRI"} {
                if contieneBytes(ventana, []byte(firma)) {
                        return true
                }
        }
        return false
}

// contieneBytes busca s dentro de ventana.
func contieneBytes(ventana, s []byte) bool {
        for i := 0; i+len(s) <= len(ventana); i++ {
                igual := true
                for j := range s {
                        if ventana[i+j] != s[j] {
                                igual = false
                                break
                        }
                }
                if igual {
                        return true
                }
        }
        return false
}
