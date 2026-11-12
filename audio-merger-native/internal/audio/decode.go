package audio

// Decodificadores streaming a PCM float32 entrelazado para los 4 formatos de
// entrada. La interfaz común alimenta la fusión (merge.go) por bloques, sin
// cargar archivos enteros en memoria.

import (
	"io"
	"os"

	mp3 "github.com/hajimehoshi/go-mp3"
	oggvorbis "github.com/jfreymuth/oggvorbis"
	"github.com/mewkiz/flac"
)

// Decodificador produce PCM float32 entrelazado por bloques.
type Decodificador interface {
	// Params devuelve tasa y canales del audio (antes del primer Leer).
	Params() (tasa, canales int)
	// Leer llena destino con muestras entrelazadas; io.EOF al final.
	Leer(destino []float32) (n int, err error)
	// Cerrar libera recursos.
	Cerrar()
}

// AbrirDecodificador abre un archivo según su formato.
func AbrirDecodificador(formato string, ruta string) (Decodificador, error) {
	switch formato {
	case "wav":
		return abrirWav(ruta)
	case "mp3":
		return abrirMp3(ruta)
	case "ogg":
		return abrirOgg(ruta)
	case "flac":
		return abrirFlac(ruta)
	}
	return nil, nuevoError(CodigoUnsupportedFormat, "formato %s no admitido", formato)
}

// ---- WAV ----

type decWav struct {
	f    *os.File
	info *InfoWav
	rest []byte // buffer de lectura crudo
}

func abrirWav(ruta string) (*decWav, error) {
	f, err := os.Open(ruta)
	if err != nil {
		return nil, nuevoError(CodigoReadFailed, "no se pudo abrir %s", ruta).conCausa(err)
	}
	info, err := AbrirWav(f)
	if err != nil {
		f.Close()
		return nil, err
	}
	if _, err := f.Seek(info.OffsetData, io.SeekStart); err != nil {
		f.Close()
		return nil, nuevoError(CodigoReadFailed, "no se pudo situar en data de %s", ruta).conCausa(err)
	}
	return &decWav{f: f, info: info}, nil
}

func (d *decWav) Params() (int, int) { return d.info.Tasa, d.info.Canales }

func (d *decWav) Leer(destino []float32) (int, error) {
	porMuestra := d.info.Bits / 8
	muestras := len(destino)
	// lee múltiplos exactos del tamaño de frame fuente
	frame := porMuestra * d.info.Canales
	if frame == 0 {
		return 0, io.EOF
	}
	muestras = muestras / d.info.Canales * d.info.Canales // múltiplo de canales
	if muestras == 0 {
		return 0, nil
	}
	crudo := make([]byte, muestras*porMuestra)
	n, err := io.ReadFull(d.f, crudo)
	usados := n / frame * frame
	out := bytesAFloat32(crudo[:usados], d.info.Bits, d.info.Flotante)
	copy(destino, out)
	if err == io.EOF || err == io.ErrUnexpectedEOF {
		if len(out) == 0 {
			return 0, io.EOF
		}
		return len(out), io.EOF
	}
	if err != nil {
		return len(out), nuevoError(CodigoDecodeFailed, "WAV truncado").conCausa(err)
	}
	return len(out), nil
}

func (d *decWav) Cerrar() { d.f.Close() }

// ---- MP3 (go-mp3: SIEMPRE emite 16-bit estéreo) ----

type decMp3 struct {
	f    *os.File
	d    *mp3.Decoder
	tasa int
}

func abrirMp3(ruta string) (*decMp3, error) {
	f, err := os.Open(ruta)
	if err != nil {
		return nil, nuevoError(CodigoReadFailed, "no se pudo abrir %s", ruta).conCausa(err)
	}
	d, err := mp3.NewDecoder(f)
	if err != nil {
		f.Close()
		return nil, nuevoError(CodigoDecodeFailed, "MP3 ilegible: %s", ruta).conCausa(err)
	}
	return &decMp3{f: f, d: d, tasa: d.SampleRate()}, nil
}

func (d *decMp3) Params() (int, int) { return d.tasa, 2 } // go-mp3 emite estéreo

func (d *decMp3) Leer(destino []float32) (int, error) {
	// destino en muestras → bytes int16
	maxMuestras := len(destino) / 2 * 2 // múltiplo de 2 canales
	if maxMuestras == 0 {
		return 0, nil
	}
	buf := make([]byte, maxMuestras*2)
	n, err := d.d.Read(buf)
	muestras := n / 2 // int16 → muestras (2 canales incluidos)
	for i := 0; i < muestras; i++ {
		v := int16(buf[i*2]) | int16(buf[i*2+1])<<8
		destino[i] = float32(v) / 32768
	}
	if err == io.EOF {
		if muestras == 0 {
			return 0, io.EOF
		}
		return muestras, io.EOF
	}
	if err != nil {
		return muestras, nuevoError(CodigoDecodeFailed, "MP3 dañado durante la decodificación").conCausa(err)
	}
	return muestras, nil
}

func (d *decMp3) Cerrar() { d.f.Close() }

// ---- OGG/Vorbis ----

type decOgg struct {
	f *os.File
	r *oggvorbis.Reader
}

func abrirOgg(ruta string) (*decOgg, error) {
	f, err := os.Open(ruta)
	if err != nil {
		return nil, nuevoError(CodigoReadFailed, "no se pudo abrir %s", ruta).conCausa(err)
	}
	r, err := oggvorbis.NewReader(f)
	if err != nil {
		f.Close()
		return nil, nuevoError(CodigoDecodeFailed, "OGG/Vorbis ilegible: %s", ruta).conCausa(err)
	}
	return &decOgg{f: f, r: r}, nil
}

func (d *decOgg) Params() (int, int) { return d.r.SampleRate(), d.r.Channels() }

func (d *decOgg) Leer(destino []float32) (int, error) {
	// oggvorbis exige len múltiplo de canales
	ch := d.r.Channels()
	if ch == 0 {
		return 0, io.EOF
	}
	max := len(destino) / ch * ch
	if max == 0 {
		return 0, nil
	}
	n, err := d.r.Read(destino[:max])
	if err == io.EOF {
		if n == 0 {
			return 0, io.EOF
		}
		return n, io.EOF
	}
	if err != nil {
		return n, nuevoError(CodigoDecodeFailed, "OGG/Vorbis dañado durante la decodificación").conCausa(err)
	}
	return n, nil
}

func (d *decOgg) Cerrar() { d.f.Close() }

// ---- FLAC ----

type decFlac struct {
	f      *os.File
	s      *flac.Stream
	buffer []float32
}

func abrirFlac(ruta string) (*decFlac, error) {
	f, err := os.Open(ruta)
	if err != nil {
		return nil, nuevoError(CodigoReadFailed, "no se pudo abrir %s", ruta).conCausa(err)
	}
	s, err := flac.New(f)
	if err != nil {
		f.Close()
		return nil, nuevoError(CodigoDecodeFailed, "FLAC ilegible: %s", ruta).conCausa(err)
	}
	return &decFlac{f: f, s: s}, nil
}

func (d *decFlac) Params() (int, int) {
	return int(d.s.Info.SampleRate), int(d.s.Info.NChannels)
}

func (d *decFlac) Leer(destino []float32) (int, error) {
	ch := int(d.s.Info.NChannels)
	if ch == 0 {
		return 0, io.EOF
	}
	// rellena desde el buffer pendiente; decodifica frames completos.
	escritos := 0
	for escritos < len(destino) {
		if len(d.buffer) == 0 {
			frame, err := d.s.ParseNext()
			if err == io.EOF {
				if escritos == 0 {
					return 0, io.EOF
				}
				return escritos, nil
			}
			if err != nil {
				return escritos, nuevoError(CodigoDecodeFailed, "FLAC dañado durante la decodificación").conCausa(err)
			}
			n := len(frame.Subframes[0].Samples)
			d.buffer = make([]float32, 0, n*ch)
			escala := escalaFlac(int(d.s.Info.BitsPerSample))
			for i := 0; i < n; i++ {
				for c := 0; c < ch; c++ {
					d.buffer = append(d.buffer, float32(frame.Subframes[c].Samples[i])/escala)
				}
			}
			continue
		}
		cabe := len(destino) - escritos
		if cabe > len(d.buffer) {
			cabe = len(d.buffer)
		}
		copy(destino[escritos:escritos+cabe], d.buffer[:cabe])
		d.buffer = d.buffer[cabe:]
		escritos += cabe
	}
	return escritos, nil
}

func escalaFlac(bits int) float32 {
	switch bits {
	case 8:
		return 128
	case 16:
		return 32768
	case 24:
		return 8388608
	default:
		return 2147483648
	}
}

func (d *decFlac) Cerrar() { d.f.Close() }
