package audio

// Lector/escritor RIFF/WAVE propio: PCM entero de 8/16/24/32 bits y IEEE
// float 32, incluido WAVE_FORMAT_EXTENSIBLE con subformato PCM/IEEE_FLOAT.
// La escritura es streaming con cabecera reparada al final (D-13: temporal).

import (
        "encoding/binary"
        "io"
        "math"
)

const (
        waveFormatPCM        = 0x0001
        waveFormatIEEEFloat  = 0x0003
        waveFormatExtensible = 0xFFFE
)

// GUID SubFormat de WAVE_FORMAT_EXTENSIBLE (prefijo estándar + código).
var guidSubFormatPCM = [16]byte{
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00,
        0x80, 0x00, 0x00, 0xAA, 0x00, 0x38, 0x9B, 0x71,
}
var guidSubFormatFloat = [16]byte{
        0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00,
        0x80, 0x00, 0x00, 0xAA, 0x00, 0x38, 0x9B, 0x71,
}

// InfoWav son los parámetros de un WAV abierto.
type InfoWav struct {
        Tasa       int
        Canales    int
        Bits       int
        Flotante   bool
        BytesData  int64
        OffsetData int64 // posición absoluta del chunk data.
}

// AbrirWav lee la cabecera de un WAV y devuelve info + reader posicionado.
// r debe ser io.ReadSeeker.
func AbrirWav(r io.ReadSeeker) (*InfoWav, error) {
        var hdr [12]byte
        if _, err := io.ReadFull(r, hdr[:]); err != nil {
                return nil, nuevoError(CodigoDecodeFailed, "cabecera RIFF ilegible").conCausa(err)
        }
        if string(hdr[0:4]) != "RIFF" || string(hdr[8:12]) != "WAVE" {
                return nil, nuevoError(CodigoDecodeFailed, "no es un archivo RIFF/WAVE")
        }

        info := &InfoWav{}
        // Recorre chunks hasta encontrar fmt y data.
        tieneFmt := false
        for {
                var ch [8]byte
                if _, err := io.ReadFull(r, ch[:]); err != nil {
                        return nil, nuevoError(CodigoDecodeFailed, "chunks RIFF truncados").conCausa(err)
                }
                id := string(ch[0:4])
                tam := int64(binary.LittleEndian.Uint32(ch[4:8]))
                switch id {
                case "fmt ":
                        if tam < 16 {
                                return nil, nuevoError(CodigoDecodeFailed, "chunk fmt demasiado corto")
                        }
                        var f [16]byte
                        if _, err := io.ReadFull(r, f[:]); err != nil {
                                return nil, nuevoError(CodigoDecodeFailed, "chunk fmt truncado").conCausa(err)
                        }
                        formato := binary.LittleEndian.Uint16(f[0:2])
                        nCanales := int(binary.LittleEndian.Uint16(f[2:4]))
                        tasa := int(binary.LittleEndian.Uint32(f[4:8]))
                        bits := int(binary.LittleEndian.Uint16(f[14:16]))
                        if formato == waveFormatExtensible {
                                if tam < 40 {
                                        return nil, nuevoError(CodigoDecodeFailed, "fmt extensible truncado")
                                }
                                var ext [24]byte // cbSize(2)+validBits(2)+channelMask(4)+GUID(16)
                                if _, err := io.ReadFull(r, ext[:]); err != nil {
                                        return nil, nuevoError(CodigoDecodeFailed, "fmt extensible truncado").conCausa(err)
                                }
                                var guid [16]byte
                                copy(guid[:], ext[8:24])
                                switch guid {
                                case guidSubFormatPCM:
                                        formato = waveFormatPCM
                                case guidSubFormatFloat:
                                        formato = waveFormatIEEEFloat
                                default:
                                        return nil, nuevoError(CodigoDecodeFailed, "subformato extensible no admitido")
                                }
                        } else if tam > 16 {
                                // descarta bytes extra del fmt
                                if _, err := io.CopyN(io.Discard, r, tam-16); err != nil {
                                        return nil, nuevoError(CodigoDecodeFailed, "fmt ilegible").conCausa(err)
                                }
                        }
                        switch formato {
                        case waveFormatPCM:
                                info.Flotante = false
                        case waveFormatIEEEFloat:
                                info.Flotante = true
                        default:
                                return nil, nuevoError(CodigoDecodeFailed, "códec WAV no admitido (no es PCM ni IEEE float)")
                        }
                        if nCanales < 1 || nCanales > 8 || tasa < 3000 || tasa > 384000 {
                                return nil, nuevoError(CodigoDecodeFailed, "parámetros WAV fuera de rango")
                        }
                        switch bits {
                        case 8, 16, 24, 32:
                                if info.Flotante && bits != 32 {
                                        return nil, nuevoError(CodigoDecodeFailed, "float de %d bits no admitido", bits)
                                }
                        default:
                                return nil, nuevoError(CodigoDecodeFailed, "profundidad de %d bits no admitida", bits)
                        }
                        info.Canales, info.Tasa, info.Bits = nCanales, tasa, bits
                        tieneFmt = true
                case "data":
                        if !tieneFmt {
                                return nil, nuevoError(CodigoDecodeFailed, "data antes de fmt")
                        }
                        info.BytesData = tam
                        pos, _ := r.Seek(0, io.SeekCurrent)
                        info.OffsetData = pos
                        // D1 (árbitro): si el data declarado excede el archivo físico,
                        // el WAV está truncado → error explícito, nunca silencio corto.
                        if fin, err := r.Seek(0, io.SeekEnd); err == nil {
                                disponible := fin - pos
                                if disponible >= 0 && info.BytesData > disponible {
                                        return nil, nuevoError(CodigoDecodeFailed,
                                                "WAV truncado: el bloque de datos declara %d bytes pero solo hay %d",
                                                info.BytesData, disponible)
                                }
                        }
                        if _, err := r.Seek(pos, io.SeekStart); err != nil {
                                return nil, nuevoError(CodigoReadFailed, "no se pudo volver a data").conCausa(err)
                        }
                        return info, nil
                default:
                        // chunk ignorado (LIST, fact, etc.) con alineación par.
                        saltar := tam + (tam & 1)
                        if _, err := r.Seek(saltar, io.SeekCurrent); err != nil {
                                return nil, nuevoError(CodigoDecodeFailed, "chunk %s ilegible", id).conCausa(err)
                        }
                }
        }
}

// MuestrasWav devuelve el nº de frames PCM del WAV.
func (w *InfoWav) Muestras() int64 {
        bps := w.Bits / 8 * w.Canales
        if bps == 0 {
                return 0
        }
        return w.BytesData / int64(bps)
}

// LeerWavPCM decodifica TODO el WAV a float32 entrelazado (para sondas y
// pruebas; la fusión usa el modo streaming).
func LeerWavPCM(r io.ReadSeeker) ([]float32, int, int, error) {
        info, err := AbrirWav(r)
        if err != nil {
                return nil, 0, 0, err
        }
        buf := make([]byte, info.BytesData)
        if _, err := io.ReadFull(r, buf); err != nil {
                return nil, 0, 0, nuevoError(CodigoDecodeFailed, "datos WAV truncados").conCausa(err)
        }
        out := bytesAFloat32(buf, info.Bits, info.Flotante)
        return out, info.Tasa, info.Canales, nil
}

// bytesAFloat32 convierte PCM crudo (LE) a float32 normalizado [-1, 1).
func bytesAFloat32(b []byte, bits int, flotante bool) []float32 {
        switch {
        case flotante && bits == 32:
                n := len(b) / 4
                out := make([]float32, n)
                for i := 0; i < n; i++ {
                        out[i] = leFloat32(b[i*4:])
                }
                return out
        case bits == 8: // unsigned
                out := make([]float32, len(b))
                for i, x := range b {
                        out[i] = (float32(x) - 128) / 128
                }
                return out
        case bits == 16:
                n := len(b) / 2
                out := make([]float32, n)
                for i := 0; i < n; i++ {
                        v := int16(binary.LittleEndian.Uint16(b[i*2:]))
                        out[i] = float32(v) / 32768
                }
                return out
        case bits == 24:
                n := len(b) / 3
                out := make([]float32, n)
                for i := 0; i < n; i++ {
                        v := int32(b[i*3]) | int32(b[i*3+1])<<8 | int32(b[i*3+2])<<16
                        if v&0x800000 != 0 {
                                v |= ^int32(0xFFFFFF)
                        }
                        out[i] = float32(v) / 8388608
                }
                return out
        case bits == 32:
                n := len(b) / 4
                out := make([]float32, n)
                for i := 0; i < n; i++ {
                        v := int32(binary.LittleEndian.Uint32(b[i*4:]))
                        out[i] = float32(v) / 2147483648
                }
                return out
        }
        return nil
}

func leFloat32(b []byte) float32 {
        return math.Float32frombits(binary.LittleEndian.Uint32(b))
}

// EscritorWav escribe WAV PCM16 de forma streaming: cabecera provisional y
// reparación final con el tamaño real.
type EscritorWav struct {
        w        io.WriteSeeker
        tasa     int
        canales  int
        escritos int64 // bytes de data escritos
        cerrado  bool
}

// NuevoEscritorWav escribe la cabecera provisional y deja el escritor listo.
func NuevoEscritorWav(w io.WriteSeeker, tasa, canales int) (*EscritorWav, error) {
        e := &EscritorWav{w: w, tasa: tasa, canales: canales}
        if err := e.escribirCabecera(0); err != nil {
                return nil, err
        }
        return e, nil
}

func (e *EscritorWav) escribirCabecera(bytesData uint32) error {
        hdr := make([]byte, 44)
        copy(hdr[0:4], "RIFF")
        binary.LittleEndian.PutUint32(hdr[4:8], 36+bytesData)
        copy(hdr[8:12], "WAVE")
        copy(hdr[12:16], "fmt ")
        binary.LittleEndian.PutUint32(hdr[16:20], 16)
        binary.LittleEndian.PutUint16(hdr[20:22], waveFormatPCM)
        binary.LittleEndian.PutUint16(hdr[22:24], uint16(e.canales))
        binary.LittleEndian.PutUint32(hdr[24:28], uint32(e.tasa))
        binary.LittleEndian.PutUint32(hdr[28:32], uint32(e.tasa*e.canales*2))
        binary.LittleEndian.PutUint16(hdr[32:34], uint16(e.canales*2))
        binary.LittleEndian.PutUint16(hdr[34:36], 16)
        copy(hdr[36:40], "data")
        binary.LittleEndian.PutUint32(hdr[40:44], bytesData)
        if _, err := e.w.Write(hdr); err != nil {
                return nuevoError(CodigoWriteFailed, "no se pudo escribir la cabecera WAV").conCausa(err)
        }
        return nil
}

// EscribirPCM añade muestras float32 entrelazadas (con clipping suave).
func (e *EscritorWav) EscribirPCM(m []float32) error {
        if len(m) == 0 {
                return nil
        }
        buf := make([]byte, len(m)*2)
        for i, f := range m {
                if f > 1 {
                        f = 1
                } else if f < -1 {
                        f = -1
                }
                v := int32(f * 32767)
                if v > 32767 {
                        v = 32767
                } else if v < -32768 {
                        v = -32768
                }
                binary.LittleEndian.PutUint16(buf[i*2:], uint16(int16(v)))
        }
        if _, err := e.w.Write(buf); err != nil {
                return nuevoError(CodigoWriteFailed, "no se pudo escribir el audio WAV").conCausa(err)
        }
        e.escritos += int64(len(buf))
        return nil
}

// Cerrar repara la cabecera con el tamaño real y cierra.
func (e *EscritorWav) Cerrar() error {
        if e.cerrado {
                return nil
        }
        e.cerrado = true
        if _, err := e.w.Seek(0, io.SeekStart); err != nil {
                return nuevoError(CodigoWriteFailed, "no se pudo rebobinar el WAV").conCausa(err)
        }
        return e.escribirCabecera(uint32(e.escritos))
}

// BytesEscritos informa del tamaño actual (para pruebas).
func (e *EscritorWav) BytesEscritos() int64 { return e.escritos }
