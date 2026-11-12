package audio

// Tests del motor con fixtures REALES generadas con ffmpeg CLI y salidas
// validadas con ffprobe (D-03). Si ffmpeg/ffprobe no están presentes, los
// tests se marcan skip con mensaje explícito (nunca pasan en falso).

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"testing"

	"fusionador/internal/i18n"
)

var (
	dirFix         string
	unaVez         sync.Once
	ffmpegPresente bool
)

func TestMain(m *testing.M) {
	var err error
	dirFix, err = os.MkdirTemp("", "fusionador-fixtures-*")
	if err != nil {
		fmt.Println("fixture dir:", err)
		os.Exit(1)
	}
	if _, err := exec.LookPath("ffmpeg"); err == nil {
		if _, err := exec.LookPath("ffprobe"); err == nil {
			ffmpegPresente = true
			generarFixtures()
		}
	}
	code := m.Run()
	os.RemoveAll(dirFix)
	os.Exit(code)
}

func requiereFF(t *testing.T) {
	t.Helper()
	if !ffmpegPresente {
		t.Skip("ffmpeg/ffprobe no disponibles: fixtures no generadas (SKIP declarado)")
	}
}

func ffx(t *testing.T, args ...string) {
	t.Helper()
	cmd := exec.Command("ffmpeg", append([]string{"-y", "-v", "error"}, args...)...)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("ffmpeg %v: %v\n%s", args, err, out)
	}
}

// generarFixtures crea el set compartido (una sola vez por proceso).
func generarFixtures() {
	ffxQuiet := func(args ...string) {
		cmd := exec.Command("ffmpeg", append([]string{"-y", "-v", "error"}, args...)...)
		if out, err := cmd.CombinedOutput(); err != nil {
			fmt.Printf("fixture ffmpeg %v: %v\n%s\n", args, err, out)
		}
	}
	F := func(n string) string { return filepath.Join(dirFix, n) }
	// WAVs (aevalsrc con amplitud 0.8 para verificar escalado de decodificación)
	ffxQuiet("-f", "lavfi", "-i", "aevalsrc=0.8*sin(2*PI*440*t):d=1.0:s=44100", "-ac", "2", "-c:a", "pcm_s16le", F("s1.wav"))
	ffxQuiet("-f", "lavfi", "-i", "aevalsrc=0.8*sin(2*PI*880*t):d=0.8:s=44100", "-ac", "2", "-c:a", "pcm_s16le", F("s2.wav"))
	ffxQuiet("-f", "lavfi", "-i", "aevalsrc=0.8*sin(2*PI*220*t):d=0.5:s=48000", "-ac", "1", "-c:a", "pcm_s16le", F("m48.wav"))
	ffxQuiet("-f", "lavfi", "-i", "aevalsrc=0.8*sin(2*PI*330*t):d=0.6:s=44100", "-ac", "2", "-c:a", "pcm_s24le", F("w24.wav"))
	ffxQuiet("-f", "lavfi", "-i", "aevalsrc=0.8*sin(2*PI*550*t):d=0.7:s=44100", "-ac", "2", "-c:a", "pcm_f32le", F("f32.wav"))
	// MP3s (CBR para duración ffprobe determinista)
	ffxQuiet("-f", "lavfi", "-i", "sine=frequency=440:duration=1.2:sample_rate=44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "128k", F("a.mp3"))
	ffxQuiet("-f", "lavfi", "-i", "sine=frequency=660:duration=0.9:sample_rate=44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k", F("b.mp3"))
	ffxQuiet("-f", "lavfi", "-i", "sine=frequency=550:duration=0.7:sample_rate=44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "128k", "-write_id3v2", "1", "-metadata", "title=ConTag", F("c.mp3"))
	ffxQuiet("-f", "lavfi", "-i", "sine=frequency=300:duration=0.6:sample_rate=44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k", F("mono.mp3"))
	ffxQuiet("-f", "lavfi", "-i", "sine=frequency=300:duration=0.5:sample_rate=22050", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "64k", F("r22.mp3"))
	// OGG / FLAC / M4A
	ffxQuiet("-f", "lavfi", "-i", "sine=frequency=440:duration=1.1:sample_rate=44100", "-ac", "2", "-c:a", "libvorbis", "-q:a", "4", F("v.ogg"))
	ffxQuiet("-f", "lavfi", "-i", "sine=frequency=660:duration=1.3:sample_rate=44100", "-ac", "2", "-c:a", "flac", F("w.flac"))
	ffxQuiet("-f", "lavfi", "-i", "sine=frequency=440:duration=0.8:sample_rate=44100", "-ac", "2", "-c:a", "aac", "-b:a", "128k", F("x.m4a"))
	// Corrupto: a.mp3 truncado a mitad de frame (55 % + 97 bytes).
	if b, err := os.ReadFile(F("a.mp3")); err == nil {
		corte := len(b)*55/100 + 97
		if corte > len(b) {
			corte = len(b) - 10
		}
		os.WriteFile(F("roto.mp3"), b[:corte], 0644)
	}
	// Basura binaria.
	os.WriteFile(F("basura.bin"), []byte{0x00, 0x01, 0x02, 0x03, 'z', 'z', 'z', 'z'}, 0644)
}

func fix(t *testing.T, nombre string) string {
	t.Helper()
	requiereFF(t)
	p := filepath.Join(dirFix, nombre)
	if _, err := os.Stat(p); err != nil {
		t.Fatalf("fixture %s no generada: %v", nombre, err)
	}
	return p
}

// ffprobeDur devuelve la duración en segundos según ffprobe.
func ffprobeDur(t *testing.T, ruta string) float64 {
	t.Helper()
	out, err := exec.Command("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", ruta).Output()
	if err != nil {
		t.Fatalf("ffprobe %s: %v", ruta, err)
	}
	var js struct {
		Format struct {
			Duration string `json:"duration"`
		} `json:"format"`
	}
	if err := json.Unmarshal(out, &js); err != nil || js.Format.Duration == "" {
		t.Fatalf("ffprobe sin duración para %s: %s", ruta, out)
	}
	var d float64
	fmt.Sscanf(js.Format.Duration, "%f", &d)
	return d
}

// duracionDecodificada mide la duración REAL decodificando el archivo de
// verdad (ffmpeg -f null): el método estándar para MP3 con bitrates mixtos,
// donde ffprobe/estimación por bitrate del primer frame miente.
func duracionDecodificada(t *testing.T, ruta string) float64 {
	t.Helper()
	out, err := exec.Command("ffmpeg", "-v", "info", "-i", ruta, "-f", "null", "-").CombinedOutput()
	if err != nil {
		t.Fatalf("ffmpeg decode %s: %v\n%s", ruta, err, out)
	}
	texto := string(out)
	// último time=HH:MM:SS.cc del log
	idx := 0
	varultima := ""
	for {
		p := indexOf(texto[idx:], "time=")
		if p < 0 {
			break
		}
		pos := idx + p
		fin := pos + 5
		for fin < len(texto) && texto[fin] != ' ' && texto[fin] != '\n' && texto[fin] != '\r' {
			fin++
		}
		varultima = texto[pos+5 : fin]
		idx = fin
	}
	if varultima == "" {
		t.Fatalf("sin time= en la decodificación de %s\n%s", ruta, texto)
	}
	var h, m int
	var s float64
	fmt.Sscanf(varultima, "%d:%d:%f", &h, &m, &s)
	return float64(h)*3600 + float64(m)*60 + s
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

// ffprobeInfo devuelve códec, tasa y canales.
func ffprobeInfo(t *testing.T, ruta string) (codec string, tasa int, canales int) {
	t.Helper()
	out, err := exec.Command("ffprobe", "-v", "error", "-select_streams", "a:0",
		"-show_entries", "stream=codec_name,sample_rate,channels", "-of", "json", ruta).Output()
	if err != nil {
		t.Fatalf("ffprobe %s: %v", ruta, err)
	}
	var js struct {
		Streams []struct {
			CodecName  string `json:"codec_name"`
			SampleRate string `json:"sample_rate"`
			Channels   int    `json:"channels"`
		} `json:"streams"`
	}
	if err := json.Unmarshal(out, &js); err != nil || len(js.Streams) == 0 {
		t.Fatalf("ffprobe sin streams para %s: %s", ruta, out)
	}
	fmt.Sscanf(js.Streams[0].SampleRate, "%d", &tasa)
	return js.Streams[0].CodecName, tasa, js.Streams[0].Channels
}

func casiIgual(t *testing.T, nombre string, a, b, tolerancia float64) {
	t.Helper()
	if d := a - b; d < -tolerancia || d > tolerancia {
		t.Errorf("%s: %.4f vs %.4f (tol ±%.4f)", nombre, a, b, tolerancia)
	}
}

// ---------- Conversor ----------

func TestConversorIdentidad(t *testing.T) {
	c, err := NewConversor(44100, 2, 44100, 2)
	if err != nil {
		t.Fatal(err)
	}
	in := []float32{0.1, -0.2, 0.3, -0.4, 0.5, -0.6}
	out := c.Procesar(in)
	if len(out) != len(in) {
		t.Fatalf("identidad cambió la longitud: %d → %d", len(in), len(out))
	}
	for i := range in {
		if out[i] != in[i] {
			t.Fatalf("identidad cambió la muestra %d: %v ≠ %v", i, out[i], in[i])
		}
	}
	if cola := c.Fin(); len(cola) != 0 {
		t.Fatalf("identidad emitió cola final de %d muestras", len(cola))
	}
}

func TestConversorMonoEstereo(t *testing.T) {
	c, err := NewConversor(44100, 1, 44100, 2)
	if err != nil {
		t.Fatal(err)
	}
	out := c.Procesar([]float32{0.25, -0.5, 0.75})
	esperado := []float32{0.25, 0.25, -0.5, -0.5, 0.75, 0.75}
	if len(out) != len(esperado) {
		t.Fatalf("mono→estéreo: %d muestras, esperadas %d", len(out), len(esperado))
	}
	for i := range esperado {
		if out[i] != esperado[i] {
			t.Errorf("mono→estéreo[%d]: %v ≠ %v", i, out[i], esperado[i])
		}
	}
	c2, _ := NewConversor(44100, 2, 44100, 1)
	out2 := c2.Procesar([]float32{0.5, -0.25, 1, -1})
	// promedios: 0.125, 0
	casiIgual(t, "stereo→mono[0]", float64(out2[0]), 0.125, 1e-6)
	casiIgual(t, "stereo→mono[1]", float64(out2[1]), 0.0, 1e-6)
}

func TestConversorResampleLongitud(t *testing.T) {
	// 1 s de 48 kHz → 44,1 kHz: ~44100 frames destino.
	c, err := NewConversor(48000, 1, 44100, 1)
	if err != nil {
		t.Fatal(err)
	}
	const n = 48000
	var total int
	for envio := 0; envio < n; envio += 4096 {
		fin := envio + 4096
		if fin > n {
			fin = n
		}
		bloque := make([]float32, fin-envio)
		for i := range bloque {
			bloque[i] = 0.5
		}
		total += len(c.Procesar(bloque))
	}
	total += len(c.Fin())
	if total < 44000 || total > 44200 {
		t.Errorf("resample 48k→44.1k de 48000 muestras: emitidas %d (esperadas ~44100)", total)
	}
}

func TestConversorResampleValor(t *testing.T) {
	// fuente a 2 Hz: muestras 0,1 → destino 4 Hz: 0, 0.5, 1, 1 (sostén final)
	c2, _ := NewConversor(2, 1, 4, 1)
	out := c2.Procesar([]float32{0, 1})
	out = append(out, c2.Fin()...)
	if len(out) != 4 {
		t.Fatalf("esperaban 4 muestras, hay %d (%v)", len(out), out)
	}
	casiIgual(t, "interp[0]", float64(out[0]), 0, 1e-6)
	casiIgual(t, "interp[1]", float64(out[1]), 0.5, 1e-6)
	casiIgual(t, "interp[2]", float64(out[2]), 1, 1e-6)
	casiIgual(t, "interp[3]", float64(out[3]), 1, 1e-6)
}

// ---------- Sonda y detección ----------

func TestDetectarFormato(t *testing.T) {
	requiereFF(t)
	casos := []struct {
		archivo string
		formato string
	}{
		{"s1.wav", "wav"}, {"w24.wav", "wav"}, {"f32.wav", "wav"},
		{"a.mp3", "mp3"}, {"c.mp3", "mp3"}, // con ID3
		{"v.ogg", "ogg"}, {"w.flac", "flac"},
		{"x.m4a", ""}, {"basura.bin", ""},
	}
	for _, c := range casos {
		f, err := DetectarFormato(filepath.Join(dirFix, c.archivo))
		if c.formato == "" {
			if err == nil {
				t.Errorf("%s: debería ser NO admitido, detecté %q", c.archivo, f)
			}
			continue
		}
		if err != nil {
			t.Errorf("%s: error inesperado %v", c.archivo, err)
		} else if f != c.formato {
			t.Errorf("%s: detecté %q, esperaba %q", c.archivo, f, c.formato)
		}
	}
}

func TestSondarDuraciones(t *testing.T) {
	requiereFF(t)
	casos := []struct {
		archivo string
		toler   float64
	}{
		{"s1.wav", 0.01}, {"m48.wav", 0.01}, {"w24.wav", 0.01},
		{"a.mp3", 0.05}, {"v.ogg", 0.05}, {"w.flac", 0.01},
	}
	for _, c := range casos {
		info, err := Sondar(filepath.Join(dirFix, c.archivo))
		if err != nil {
			t.Errorf("%s: sonda falló: %v", c.archivo, err)
			continue
		}
		durFF := ffprobeDur(t, filepath.Join(dirFix, c.archivo))
		casiIgual(t, "duración "+c.archivo, info.Duracion, durFF, c.toler)
	}
}

// ---------- WAV escritura/lectura ----------

func TestEscritorWavCabecera(t *testing.T) {
	p := filepath.Join(t.TempDir(), "salida.wav")
	f, err := os.Create(p)
	if err != nil {
		t.Fatal(err)
	}
	esc := NuevoEscritorWavSafe(f, 44100, 2)
	// 0,5 s de silencio: 22050 frames.
	m := make([]float32, 22050*2)
	if err := esc.EscribirPCM(m); err != nil {
		t.Fatal(err)
	}
	if err := esc.Cerrar(); err != nil {
		t.Fatal(err)
	}
	f.Close()
	st, _ := os.Stat(p)
	if st.Size() != 44+22050*4 {
		t.Fatalf("tamaño WAV %d, esperado %d", st.Size(), 44+22050*4)
	}
	// ffprobe valida la cabecera de verdad.
	dur := ffprobeDur(t, p)
	casiIgual(t, "duración WAV propio", dur, 0.5, 0.01)
	codec, tasa, ch := ffprobeInfo(t, p)
	if codec != "pcm_s16le" || tasa != 44100 || ch != 2 {
		t.Errorf("WAV propio: %s %d Hz %d ch (esperaba pcm_s16le 44100 2)", codec, tasa, ch)
	}
}

func TestLeerWavProfundidades(t *testing.T) {
	requiereFF(t)
	for _, archivo := range []string{"s1.wav", "w24.wav", "f32.wav"} {
		f, err := os.Open(filepath.Join(dirFix, archivo))
		if err != nil {
			t.Fatal(err)
		}
		m, tasa, ch, err := LeerWavPCM(f)
		f.Close()
		if err != nil {
			t.Errorf("%s: %v", archivo, err)
			continue
		}
		if tasa != 44100 || ch != 2 {
			t.Errorf("%s: %d Hz %d ch", archivo, tasa, ch)
		}
		if len(m) == 0 {
			t.Errorf("%s: sin muestras", archivo)
			continue
		}
		// seno ±0.8: rango razonable tras normalizar
		max := 0.0
		for _, v := range m {
			if a := float64(v); a > max {
				max = a
			}
		}
		if max < 0.5 || max > 1.0 {
			t.Errorf("%s: amplitud máxima sospechosa: %f", archivo, max)
		}
	}
}

// ---------- Fusión ----------

func fusionaWAV(t *testing.T, entradas []string) string {
	t.Helper()
	salida := filepath.Join(t.TempDir(), "fusion.wav")
	err := Fusionar(context.Background(), entradas, salida, OpcionesFusion{FormatoSalida: "wav"}, nil)
	if err != nil {
		t.Fatalf("fusión WAV falló: %v", err)
	}
	if _, err := os.Stat(salida); err != nil {
		t.Fatalf("salida inexistente: %v", err)
	}
	return salida
}

func TestFusionWavHomogeneo(t *testing.T) {
	requiereFF(t)
	p := fusionaWAV(t, []string{fix(t, "s1.wav"), fix(t, "s2.wav")})
	dur := ffprobeDur(t, p)
	casiIgual(t, "duración fusionada", dur, 1.0+0.8, 0.03)
	codec, tasa, ch := ffprobeInfo(t, p)
	if codec != "pcm_s16le" || tasa != 44100 || ch != 2 {
		t.Errorf("salida: %s %d Hz %d ch", codec, tasa, ch)
	}
}

func TestFusionWavHeterogeneo(t *testing.T) {
	requiereFF(t)
	// 1ª pista fija el destino: 44100 estéreo. Entra 48k mono y 24 bits.
	entradas := []string{fix(t, "s1.wav"), fix(t, "m48.wav"), fix(t, "w24.wav"), fix(t, "f32.wav")}
	p := fusionaWAV(t, entradas)
	esperado := 1.0 + 0.5 + 0.6 + 0.7
	dur := ffprobeDur(t, p)
	casiIgual(t, "duración heterogénea", dur, esperado, 0.05)
	_, tasa, ch := ffprobeInfo(t, p)
	if tasa != 44100 || ch != 2 {
		t.Errorf("destino no es 44100 estéreo: %d Hz %d ch", tasa, ch)
	}
}

func TestFusionOggFlacWav(t *testing.T) {
	requiereFF(t)
	entradas := []string{fix(t, "v.ogg"), fix(t, "w.flac"), fix(t, "s2.wav")}
	p := fusionaWAV(t, entradas)
	dur := ffprobeDur(t, p)
	casiIgual(t, "duración ogg+flac+wav", dur, 1.1+1.3+0.8, 0.08)
}

func TestFusionMp3Copia(t *testing.T) {
	requiereFF(t)
	salida := filepath.Join(t.TempDir(), "fusion.mp3")
	entradas := []string{fix(t, "a.mp3"), fix(t, "b.mp3"), fix(t, "c.mp3")}
	err := Fusionar(context.Background(), entradas, salida, OpcionesFusion{FormatoSalida: "mp3"}, nil)
	if err != nil {
		t.Fatalf("fusión MP3 copia: %v", err)
	}
	codec, tasa, ch := ffprobeInfo(t, salida)
	if codec != "mp3" {
		t.Errorf("códec de salida: %s", codec)
	}
	if tasa != 44100 || ch != 2 {
		t.Errorf("salida %d Hz %d ch (esperaba 44100 2)", tasa, ch)
	}
	// Duración medida decodificando de verdad (mezcla 128k/192k: la
	// estimación por bitrate del primer frame miente). Se descartan los
	// frames Xing/Info, por lo que solo queda audio real.
	dur := duracionDecodificada(t, salida)
	casiIgual(t, "duración MP3 copia", dur, 1.2+0.9+0.7, 0.15)
	// La salida NO debe llevar ID3: primer frame tras saltar cualquier tag.
	if b, err := os.ReadFile(salida); err == nil {
		if len(b) > 3 && string(b[0:3]) == "ID3" {
			t.Errorf("la salida MP3 lleva ID3 de origen: no se eliminó")
		}
	}
}

func TestFusionMp3MismatchTasa(t *testing.T) {
	requiereFF(t)
	salida := filepath.Join(t.TempDir(), "x.mp3")
	err := Fusionar(context.Background(), []string{fix(t, "a.mp3"), fix(t, "r22.mp3")}, salida, OpcionesFusion{FormatoSalida: "mp3"}, nil)
	if !DeCodigo(err, CodigoParamMismatch) {
		t.Fatalf("esperaba PARAM_MISMATCH, obtuve %v", err)
	}
	if _, err := os.Stat(salida); err == nil {
		t.Errorf("no debe existir salida en fallo")
	}
}

func TestFusionMp3MismatchCanales(t *testing.T) {
	requiereFF(t)
	salida := filepath.Join(t.TempDir(), "x.mp3")
	err := Fusionar(context.Background(), []string{fix(t, "a.mp3"), fix(t, "mono.mp3")}, salida, OpcionesFusion{FormatoSalida: "mp3"}, nil)
	if !DeCodigo(err, CodigoParamMismatch) {
		t.Fatalf("esperaba PARAM_MISMATCH, obtuve %v", err)
	}
}

func TestFusionMp3ConWav(t *testing.T) {
	requiereFF(t)
	salida := filepath.Join(t.TempDir(), "x.mp3")
	err := Fusionar(context.Background(), []string{fix(t, "a.mp3"), fix(t, "s1.wav")}, salida, OpcionesFusion{FormatoSalida: "mp3"}, nil)
	if !DeCodigo(err, CodigoParamMismatch) {
		t.Fatalf("esperaba PARAM_MISMATCH, obtuve %v", err)
	}
}

func TestFusionSinPistas(t *testing.T) {
	salida := filepath.Join(t.TempDir(), "x.wav")
	err := Fusionar(context.Background(), []string{fix(t, "s1.wav")}, salida, OpcionesFusion{FormatoSalida: "wav"}, nil)
	if !DeCodigo(err, CodigoNoTracks) {
		t.Fatalf("esperaba NO_TRACKS, obtuve %v", err)
	}
}

func TestFusionFormatoInvalido(t *testing.T) {
	salida := filepath.Join(t.TempDir(), "x.ogg")
	err := Fusionar(context.Background(), []string{fix(t, "s1.wav"), fix(t, "s2.wav")}, salida, OpcionesFusion{FormatoSalida: "ogg"}, nil)
	if !DeCodigo(err, CodigoInvalidOptions) {
		t.Fatalf("esperaba INVALID_OPTIONS, obtuve %v", err)
	}
}

func TestFusionCancelada(t *testing.T) {
	requiereFF(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	salida := filepath.Join(t.TempDir(), "x.wav")
	err := Fusionar(ctx, []string{fix(t, "s1.wav"), fix(t, "s2.wav")}, salida, OpcionesFusion{FormatoSalida: "wav"}, nil)
	if !DeCodigo(err, CodigoUserCancelled) {
		t.Fatalf("esperaba USER_CANCELLED, obtuve %v", err)
	}
	if _, err := os.Stat(salida); err == nil {
		t.Errorf("no debe quedar salida tras cancelar")
	}
}

func TestFusionM4aNoAdmitida(t *testing.T) {
	requiereFF(t)
	_, err := Sondar(fix(t, "x.m4a"))
	if !DeCodigo(err, CodigoUnsupportedFormat) {
		t.Fatalf("esperaba UNSUPPORTED_FORMAT, obtuve %v", err)
	}
}

func TestFusionMp3Roto(t *testing.T) {
	requiereFF(t)
	salida := filepath.Join(t.TempDir(), "x.mp3")
	err := Fusionar(context.Background(), []string{fix(t, "a.mp3"), fix(t, "roto.mp3")}, salida, OpcionesFusion{FormatoSalida: "mp3"}, nil)
	if !DeCodigo(err, CodigoDecodeFailed) {
		t.Fatalf("esperaba DECODE_FAILED (copia valida frames), obtuve %v", err)
	}
	// atomicidad: sin salida ni temporal
	if _, err := os.Stat(salida); err == nil {
		t.Errorf("no debe existir salida tras error")
	}
	resto, _ := filepath.Glob(filepath.Join(t.TempDir(), "*"))
	for _, r := range resto {
		t.Errorf("quedó archivo residual: %s", r)
	}
}

func TestFusionMp3RotoComoWav(t *testing.T) {
	requiereFF(t)
	salida := filepath.Join(t.TempDir(), "x.wav")
	err := Fusionar(context.Background(), []string{fix(t, "a.mp3"), fix(t, "roto.mp3")}, salida, OpcionesFusion{FormatoSalida: "wav"}, nil)
	if !DeCodigo(err, CodigoDecodeFailed) {
		t.Fatalf("esperaba DECODE_FAILED (go-mp3), obtuve %v", err)
	}
}

func TestFusionProgresoMonotono(t *testing.T) {
	requiereFF(t)
	salida := filepath.Join(t.TempDir(), "p.wav")
	var ultimo float64 = -1
	violaciones := 0
	err := Fusionar(context.Background(), []string{fix(t, "s1.wav"), fix(t, "s2.wav"), fix(t, "m48.wav")}, salida, OpcionesFusion{FormatoSalida: "wav"},
		func(p Progreso) {
			if p.Fraccion < ultimo-1e-9 {
				violaciones++
			}
			ultimo = p.Fraccion
		})
	if err != nil {
		t.Fatal(err)
	}
	if violaciones > 0 {
		t.Errorf("progreso retrocedió %d veces", violaciones)
	}
	if ultimo > 1.0001 {
		t.Errorf("progreso final %f > 1", ultimo)
	}
}

func TestFusionArchivoGiganteSparse(t *testing.T) {
	// sparse de 600 MB con cabecera WAV: debe caer en FILE_TOO_LARGE sin
	// leer 600 MB reales.
	p := filepath.Join(t.TempDir(), "gigante.wav")
	f, err := os.Create(p)
	if err != nil {
		t.Fatal(err)
	}
	hdr := make([]byte, 44)
	copy(hdr, "RIFF")
	copy(hdr[8:12], "WAVE")
	copy(hdr[12:16], "fmt ")
	f.Write(hdr)
	f.Close()
	if err := os.Truncate(p, 600<<20); err != nil {
		t.Fatal(err)
	}
	salida := filepath.Join(t.TempDir(), "x.wav")
	err = Fusionar(context.Background(), []string{p, fix(t, "s1.wav")}, salida, OpcionesFusion{FormatoSalida: "wav"}, nil)
	if !DeCodigo(err, CodigoFileTooLarge) {
		t.Fatalf("esperaba FILE_TOO_LARGE, obtuve %v", err)
	}
}

// ---------- Límite de pistas ----------

func TestLimitePistas(t *testing.T) {
	requiereFF(t)
	if _, err := exec.LookPath("ffmpeg"); err == nil {
		// genera 3 minis WAV válidos y fusiona 3 (por debajo del límite).
		mini := filepath.Join(dirFix, "mini.wav")
		if _, err := os.Stat(mini); err != nil {
			ffx(t, "-f", "lavfi", "-i", "sine=frequency=440:duration=0.05", "-ac", "1", "-c:a", "pcm_s16le", mini)
		}
		salida := filepath.Join(t.TempDir(), "mini-out.wav")
		if err := Fusionar(context.Background(), []string{mini, mini, mini}, salida, OpcionesFusion{FormatoSalida: "wav"}, nil); err != nil {
			t.Fatalf("fusión de 3 minis: %v", err)
		}
		dur := ffprobeDur(t, salida)
		casiIgual(t, "duración minis", dur, 0.15, 0.02)
	}
}

// ---------- Formateo castellano (i18n) ----------

func TestFormatosCastellano(t *testing.T) {
	if s := i18n.FormatoTamanyo(512 << 20); s != "512 MB" {
		t.Errorf("512 MiB → %s", s)
	}
	if s := i18n.FormatoTasa(44100); s != "44,1 kHz" {
		t.Errorf("44100 → %s", s)
	}
	if s := i18n.FormatoDuracion(63.4); s != "1:03" {
		t.Errorf("63.4 s → %s", s)
	}
	if s := i18n.FormatoDuracion(0.8); s != "0,8 s" {
		t.Errorf("0.8 s → %s", s)
	}
	if s := i18n.DescripcionCanales(2); s != "estéreo" {
		t.Errorf("2 canales → %s", s)
	}
}

// ---------- Regresiones de la auditoría (D1/D2 del árbitro) ----------

func TestWavTruncadoRegresionD1(t *testing.T) {
	requiereFF(t)
	// s1.wav cortado al 60 %: el chunk data declara más de lo que hay.
	orig, err := os.ReadFile(fix(t, "s1.wav"))
	if err != nil {
		t.Fatal(err)
	}
	p := filepath.Join(t.TempDir(), "trunc.wav")
	os.WriteFile(p, orig[:len(orig)*60/100], 0644)

	// Sondar debe fallar con DECODE_FAILED (no duración corta silenciosa).
	_, err = Sondar(p)
	if !DeCodigo(err, CodigoDecodeFailed) {
		t.Fatalf("D1 sonda: esperaba DECODE_FAILED, obtuve %v", err)
	}

	// Fusionar también debe fallar explícitamente.
	salida := filepath.Join(t.TempDir(), "x.wav")
	err = Fusionar(context.Background(), []string{p, fix(t, "s1.wav")}, salida, OpcionesFusion{FormatoSalida: "wav"}, nil)
	if !DeCodigo(err, CodigoDecodeFailed) {
		t.Fatalf("D1 fusión: esperaba DECODE_FAILED, obtuve %v", err)
	}
	if _, err := os.Stat(salida); err == nil {
		t.Errorf("no debe existir salida tras WAV truncado")
	}
}

func TestMp3ConId3v1RegresionD2(t *testing.T) {
	requiereFF(t)
	// MP3 con tag ID3v1 al final: el modo copia debe tolerar la cola.
	p := filepath.Join(dirFix, "conid3v1.mp3")
	if _, err := os.Stat(p); err != nil {
		ffx(t, "-f", "lavfi", "-i", "sine=frequency=440:duration=0.8:sample_rate=44100",
			"-ac", "2", "-c:a", "libmp3lame", "-b:a", "128k",
			"-write_id3v1", "1", p)
	}
	salida := filepath.Join(t.TempDir(), "copia.mp3")
	err := Fusionar(context.Background(), []string{fix(t, "a.mp3"), p}, salida, OpcionesFusion{FormatoSalida: "mp3"}, nil)
	if err != nil {
		t.Fatalf("D2: MP3 con ID3v1 debe fusionarse en modo copia, obtuve %v", err)
	}
	codec, tasa, ch := ffprobeInfo(t, salida)
	if codec != "mp3" || tasa != 44100 || ch != 2 {
		t.Errorf("D2 salida: %s %d Hz %d ch", codec, tasa, ch)
	}
	dur := duracionDecodificada(t, salida)
	casiIgual(t, "D2 duración", dur, 1.2+0.8, 0.15)
	// la salida no debe contener el tag ID3v1 («TAG» en los últimos 128 bytes)
	if b, err := os.ReadFile(salida); err == nil && len(b) >= 128 {
		if string(b[len(b)-128:len(b)-125]) == "TAG" {
			t.Errorf("D2: la salida heredó el tag ID3v1 de origen")
		}
	}
}
