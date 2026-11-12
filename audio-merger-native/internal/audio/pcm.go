package audio

// Conversor transforma PCM float32 entrelazado de (tasaFuente, canalesFuente)
// a (tasaDestino, canalesDestino) de forma STREAMING (con estado entre
// bloques). D-06: interpolación lineal para la tasa; conversión simple de
// canales (mono→estéreo duplica, estéreo→mono promedia, >2 toma L/R).

import "fmt"

type Conversor struct {
	tasaSrc, tasaDst int
	canSrc, canDst   int

	// Estado del remuestreo (índices absolutos desde el inicio del stream).
	posAbs    float64   // posición fuente (frames) del próximo sample destino.
	totalSrc  int64     // total de frames fuente vistos.
	ultimo    []float32 // último frame fuente (ya convertido de canales).
	hayUltimo bool
	emitidos  int64 // frames destino emitidos.
}

// NewConversor valida parámetros y crea el conversor.
func NewConversor(tasaSrc, canSrc, tasaDst, canDst int) (*Conversor, error) {
	if tasaSrc <= 0 || tasaDst <= 0 || canSrc <= 0 || canDst <= 0 {
		return nil, fmt.Errorf("parámetros de conversión inválidos: %d Hz %dc → %d Hz %dc", tasaSrc, canSrc, tasaDst, canDst)
	}
	return &Conversor{
		tasaSrc: tasaSrc, tasaDst: tasaDst,
		canSrc: canSrc, canDst: canDst,
	}, nil
}

// Identidad indica si no hay conversión necesaria.
func (c *Conversor) Identidad() bool {
	return c.tasaSrc == c.tasaDst && c.canSrc == c.canDst
}

// Procesar convierte un bloque de entrada (múltiplo de canSrc) y devuelve el
// bloque convertido (múltiplo de canDst). Puede devolver 0 muestras si aún no
// hay suficiente material para interpolar.
func (c *Conversor) Procesar(in []float32) []float32 {
	n := len(in) / c.canSrc // frames fuente del bloque
	if n == 0 {
		return nil
	}

	// Identidad: pasar directo (el frame incompleto final se descarta).
	if c.Identidad() {
		return in[:n*c.canSrc]
	}

	// 1) Conversión de canales del bloque.
	bloque := make([]float32, 0, n*c.canDst)
	for i := 0; i < n; i++ {
		bloque = append(bloque, convCanal(in[i*c.canSrc:(i+1)*c.canSrc], c.canDst)...)
	}

	// Solo canales distintos: emitir todo.
	if c.tasaSrc == c.tasaDst {
		c.totalSrc += int64(n)
		c.ultimo = append([]float32(nil), bloque[(n-1)*c.canDst:]...)
		c.hayUltimo = true
		return bloque
	}

	// 2) Remuestreo lineal con posiciones absolutas.
	// frame en índice absoluto i:
	//   i == totalSrc-1  → c.ultimo
	//   i >= totalSrc    → bloque[(i-totalSrc)*canDst :]
	var out []float32
	frameDe := func(i int64) []float32 {
		if i == c.totalSrc-1 {
			return c.ultimo
		}
		off := int(i-c.totalSrc) * c.canDst
		return bloque[off : off+c.canDst]
	}

	ratio := float64(c.tasaSrc) / float64(c.tasaDst)
	for {
		i0 := int64(c.posAbs)
		// Necesitamos frames i0 e i0+1; disponibles: [totalSrc-1, totalSrc+n-1]
		if i0+1 > c.totalSrc+int64(n)-1 {
			break // esperamos más datos
		}
		frac := c.posAbs - float64(i0)
		a := frameDe(i0)
		b := frameDe(i0 + 1)
		for ch := 0; ch < c.canDst; ch++ {
			v := a[ch] + float32(frac)*(b[ch]-a[ch])
			out = append(out, v)
		}
		c.posAbs += ratio
		c.emitidos++
	}

	// Avanzar el estado: el último frame del bloque pasa a histórico.
	c.ultimo = append([]float32(nil), bloque[(n-1)*c.canDst:]...)
	c.hayUltimo = true
	c.totalSrc += int64(n)
	return out
}

// Fin señala el fin del stream: emite muestras de sostenido del último frame
// hasta cubrir la longitud destino equivalente al material fuente recibido.
func (c *Conversor) Fin() []float32 {
	if c.tasaSrc == c.tasaDst || !c.hayUltimo {
		return nil
	}
	var out []float32
	for c.posAbs < float64(c.totalSrc) {
		out = append(out, c.ultimo...)
		c.posAbs += float64(c.tasaSrc) / float64(c.tasaDst)
		c.emitidos++
	}
	return out
}

// convCanal convierte UN frame entre números de canales (regla simple de D-06).
func convCanal(frame []float32, canDst int) []float32 {
	src := len(frame)
	if src == canDst {
		return frame
	}
	out := make([]float32, canDst)
	switch {
	case src == 1:
		for ch := 0; ch < canDst; ch++ {
			out[ch] = frame[0]
		}
	case canDst == 1:
		var suma float64
		for _, s := range frame {
			suma += float64(s)
		}
		out[0] = float32(suma / float64(src))
	case canDst == 2 && src > 2:
		out[0], out[1] = frame[0], frame[1]
	case src == 2 && canDst > 2:
		for ch := 0; ch < canDst; ch++ {
			out[ch] = frame[ch%2]
		}
	default:
		for ch := 0; ch < canDst; ch++ {
			out[ch] = frame[ch%src]
		}
	}
	return out
}
