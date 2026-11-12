package audio

// Sonda de archivos: detecta el formato REAL por magic bytes (la extensión no
// se fía de nada, D-14) y extrae tasa/canales/duración con el mínimo coste.

import (
	"os"
	"path/filepath"
	"strings"
)

// Info de una pista, para la lista de la GUI.
type Info struct {
	Formato  string // "wav" | "mp3" | "ogg" | "flac"
	Tasa     int
	Canales  int
	Duracion float64 // segundos
	Bytes    int64
	Ruta     string
	Nombre   string
}

// DetectarFormato devuelve el ID de formato tras oler los magic bytes.
// La extensión solo se usa como pista para disambiguar; el magic manda.
func DetectarFormato(ruta string) (string, error) {
	f, err := os.Open(ruta)
	if err != nil {
		return "", nuevoError(CodigoReadFailed, "no se pudo abrir %s", ruta).conCausa(err)
	}
	defer f.Close()
	var cab [12]byte
	n, _ := f.Read(cab[:])
	if n < 4 {
		return "", nuevoError(CodigoUnsupportedFormat, "archivo vacío: %s", ruta)
	}
	switch {
	case string(cab[0:4]) == "RIFF" && n >= 12 && string(cab[8:12]) == "WAVE":
		return "wav", nil
	case string(cab[0:4]) == "fLaC":
		return "flac", nil
	case string(cab[0:4]) == "OggS":
		return "ogg", nil
	case string(cab[0:3]) == "ID3":
		return "mp3", nil
	default:
		// MP3 sin ID3: sincronía de frame en los primeros bytes.
		if cab[0] == 0xFF && cab[1]&0xE0 == 0xE0 {
			if _, ok := parseHeaderMP3(cab[:4]); ok {
				return "mp3", nil
			}
		}
		return "", nuevoError(CodigoUnsupportedFormat, "formato no reconocido en %s", filepath.Base(ruta))
	}
}

// Sondar extrae la Info completa de un archivo de audio.
func Sondar(ruta string) (Info, error) {
	info := Info{Ruta: ruta, Nombre: filepath.Base(ruta)}
	st, err := os.Stat(ruta)
	if err != nil {
		return info, nuevoError(CodigoReadFailed, "no se pudo leer %s", ruta).conCausa(err)
	}
	if st.IsDir() {
		return info, nuevoError(CodigoUnsupportedFormat, "%s es una carpeta", ruta)
	}
	info.Bytes = st.Size()
	if info.Bytes == 0 {
		return info, nuevoError(CodigoUnsupportedFormat, "archivo vacío: %s", ruta)
	}

	formato, err := DetectarFormato(ruta)
	if err != nil {
		return info, err
	}
	info.Formato = formato

	switch formato {
	case "wav":
		f, err := os.Open(ruta)
		if err != nil {
			return info, nuevoError(CodigoReadFailed, "no se pudo abrir %s", ruta).conCausa(err)
		}
		defer f.Close()
		w, err := AbrirWav(f)
		if err != nil {
			return info, err
		}
		info.Tasa, info.Canales = w.Tasa, w.Canales
		info.Duracion = float64(w.Muestras()) / float64(w.Tasa)
	case "mp3":
		e, err := NuevoEscanerMP3(ruta)
		if err != nil {
			return info, err
		}
		defer e.Cerrar()
		for {
			ok, err := e.Siguiente()
			if err != nil {
				return info, err
			}
			if !ok {
				break
			}
		}
		info.Tasa, info.Canales = e.Info.Tasa, e.Info.Canales
		info.Duracion = e.Duracion()
	case "ogg":
		d, err := abrirOgg(ruta)
		if err != nil {
			return info, err
		}
		defer d.Cerrar()
		info.Tasa, info.Canales = d.Params()
		long := d.r.Length()
		if long > 0 {
			info.Duracion = float64(long) / float64(info.Tasa)
		}
	case "flac":
		d, err := abrirFlac(ruta)
		if err != nil {
			return info, err
		}
		defer d.Cerrar()
		info.Tasa, info.Canales = d.Params()
		if d.s.Info.NSamples > 0 {
			info.Duracion = float64(d.s.Info.NSamples) / float64(info.Tasa)
		}
	}
	return info, nil
}

// ExtNormaliza devuelve la extensión en minúsculas con punto.
func ExtNormaliza(nombre string) string {
	return strings.ToLower(filepath.Ext(nombre))
}
