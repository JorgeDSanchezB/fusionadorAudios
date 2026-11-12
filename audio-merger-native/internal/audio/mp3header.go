package audio

// Cabeceras MPEG (Layer III): parseo de frame header, escaneo de duración y
// soporte al «modo copia» (concatenación de frames, D-05). Todo el parseo es
// tolerante: ante datos no válidos devuelve DECODE_FAILED con offset.

import (
	"io"
	"os"
)

// Tabla de tasas MPEG (Hz) por versión.
var tasasMPEG = map[byte][4]int{
	3: {44100, 48000, 32000, 0}, // MPEG 1
	2: {22050, 24000, 16000, 0}, // MPEG 2
	0: {11025, 12000, 8000, 0},  // MPEG 2.5
}

// Tabla de bitrates (kbps) por versión/índice (Layer III).
var bitratesMPEG1L3 = [16]int{0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0}
var bitratesMPEG2L3 = [16]int{0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0}

// HeaderMP3 es la cabecera de un frame MPEG audio.
type HeaderMP3 struct {
	Version  byte // 3=MPEG1, 2=MPEG2, 0=MPEG2.5 (bits de versión sin invertir)
	Layer    byte // 1 = Layer III (tras decodificar)
	Tasa     int  // Hz
	Bitrate  int  // kbps de ESTE frame
	Canales  int  // 1 si mono, 2 si no
	Modo     byte // 3=mono, 0=estéreo, 1=junto, 2=dual
	Longitud int  // bytes del frame (incluye cabecera)
	Muestras int  // muestras por canal del frame (1152 MPEG1, 576 MPEG2/2.5)
	Padding  int
}

// parseHeaderMP3 decodifica 4 bytes de cabecera de frame.
func parseHeaderMP3(b []byte) (HeaderMP3, bool) {
	var h HeaderMP3
	if len(b) < 4 {
		return h, false
	}
	if b[0] != 0xFF || b[1]&0xE0 != 0xE0 {
		return h, false // sin sync
	}
	ver := (b[1] >> 3) & 0x03
	layer := (b[1] >> 1) & 0x03
	if ver == 1 || layer == 0 {
		return h, false // reservado
	}
	// layer: 01=Layer III, 10=Layer II, 11=Layer I
	if layer != 1 {
		return h, false // solo Layer III soportado en modo copia
	}
	h.Version = ver
	h.Layer = 3

	// protection bit (b[1]&1==0 → CRC presente: frame es 2 bytes más largo)
	crc := b[1]&1 == 0

	idxTasa := (b[2] >> 2) & 0x03
	tasas := tasasMPEG[ver]
	if idxTasa > 3 || tasas[idxTasa] == 0 {
		return h, false
	}
	h.Tasa = tasas[idxTasa]

	idxBitrate := b[2] >> 4
	if ver == 3 {
		h.Bitrate = bitratesMPEG1L3[idxBitrate]
	} else {
		h.Bitrate = bitratesMPEG2L3[idxBitrate]
	}
	if h.Bitrate == 0 {
		return h, false // free/bad
	}

	h.Padding = int((b[2] >> 1) & 0x01)
	h.Modo = (b[3] >> 6) & 0x03
	h.Canales = 1
	if h.Modo != 3 {
		h.Canales = 2
	}

	if ver == 3 {
		h.Muestras = 1152
	} else {
		h.Muestras = 576
	}
	h.Longitud = h.Muestras/8*h.Bitrate*1000/h.Tasa + h.Padding
	if crc {
		h.Longitud += 2
	}
	if h.Longitud < 4 {
		return h, false
	}
	return h, true
}

// saltarID3 devuelve el offset del primer byte tras un posible ID3v2.
func saltarID3(b []byte) int {
	if len(b) >= 10 && string(b[0:3]) == "ID3" {
		tam := int(b[6]&0x7F)<<21 | int(b[7]&0x7F)<<14 | int(b[8]&0x7F)<<7 | int(b[9]&0x7F)
		return 10 + tam
	}
	return 0
}

// InfoMP3 resume un MP3 escaneando cabeceras (rate, canales reales, nº frames).
type InfoMP3 struct {
	Tasa             int
	Canales          int
	Version          byte
	Frames           int64
	MuestrasPorFrame int
}

// EscanerMP3 recorre un archivo MP3 leyendo SOLO cabeceras de frame.
// Detecta frames truncados (posición final > tamaño real) y tolera colas
// cortas de basura o tags ID3v1 al final (práctica estándar de decodificadores).
type EscanerMP3 struct {
	f      *os.File
	pos    int64
	tamFin int64
	Info   InfoMP3
}

// NuevoEscanerMP3 abre y sondea un MP3 (primer frame válido).
func NuevoEscanerMP3(ruta string) (*EscanerMP3, error) {
	f, err := os.Open(ruta)
	if err != nil {
		return nil, nuevoError(CodigoReadFailed, "no se pudo abrir %s", ruta).conCausa(err)
	}
	e := &EscanerMP3{f: f}
	if st, err := f.Stat(); err == nil {
		e.tamFin = st.Size()
	} else {
		f.Close()
		return nil, nuevoError(CodigoReadFailed, "stat falló en %s", ruta).conCausa(err)
	}
	// salta ID3v2
	var hdr [10]byte
	if _, err := io.ReadFull(f, hdr[:]); err != nil {
		f.Close()
		return nil, nuevoError(CodigoDecodeFailed, "MP3 ilegible al inicio").conCausa(err)
	}
	off := saltarID3(hdr[:])
	if _, err := f.Seek(int64(off), io.SeekStart); err != nil {
		f.Close()
		return nil, nuevoError(CodigoReadFailed, "no se pudo buscar en %s", ruta).conCausa(err)
	}
	// primer frame
	var fh [4]byte
	if _, err := io.ReadFull(f, fh[:]); err != nil {
		f.Close()
		return nil, nuevoError(CodigoDecodeFailed, "sin frames MP3").conCausa(err)
	}
	h, ok := parseHeaderMP3(fh[:])
	if !ok {
		f.Close()
		return nil, nuevoError(CodigoDecodeFailed, "cabecera del primer frame MP3 inválida")
	}
	e.Info = InfoMP3{Tasa: h.Tasa, Canales: h.Canales, Version: h.Version, MuestrasPorFrame: h.Muestras}
	e.pos = int64(off)
	return e, nil
}

// Siguiente avanza un frame. Devuelve false al EOF limpio; error si el
// archivo está truncado a mitad de frame o tiene un frame inválido interno.
func (e *EscanerMP3) Siguiente() (bool, error) {
	if e.tamFin > 0 && e.pos >= e.tamFin {
		return false, nil
	}
	if _, err := e.f.Seek(e.pos, io.SeekStart); err != nil {
		return false, nuevoError(CodigoReadFailed, "seek MP3 falló").conCausa(err)
	}
	var fh [4]byte
	n, err := io.ReadFull(e.f, fh[:])
	if err == io.EOF || (err == io.ErrUnexpectedEOF && n == 0) {
		return false, nil
	}
	if err == io.ErrUnexpectedEOF && n > 0 && n < 4 {
		// cola final de <4 bytes sin sync completo: tolerada
		return false, nil
	}
	if err != nil {
		return false, nuevoError(CodigoReadFailed, "lectura MP3 falló").conCausa(err)
	}
	h, ok := parseHeaderMP3(fh[:])
	if !ok {
		// cola corta de basura o tag ID3v1 («TAG…») al final: tolerada
		if e.tamFin-e.pos <= 4096 {
			return false, nil
		}
		return false, nuevoError(CodigoDecodeFailed, "frame MP3 inválido en el byte %d", e.pos)
	}
	e.pos += int64(h.Longitud)
	e.Info.Frames++
	if e.tamFin > 0 && e.pos > e.tamFin {
		return false, nuevoError(CodigoDecodeFailed, "MP3 truncado: el frame del byte %d está incompleto", e.pos-int64(h.Longitud))
	}
	return true, nil
}

// Duracion devuelve la duración total escaneada.
func (e *EscanerMP3) Duracion() float64 {
	if e.Info.Tasa == 0 {
		return 0
	}
	return float64(e.Info.Frames*int64(e.Info.MuestrasPorFrame)) / float64(e.Info.Tasa)
}

// Cerrar cierra el archivo.
func (e *EscanerMP3) Cerrar() { e.f.Close() }
