// genicon genera resources/icon.ico programáticamente (D-10): barras de
// onda de audio en blanco sobre fondo teal con una barra ámbar central.
// Tamaños 16/32/48 en BMP clásico y 64/128/256 en PNG (formato ICO).
package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"path/filepath"
)

// pinta dibuja el icono en tamaño n (con supersampling 4×).
func pinta(n int) *image.NRGBA {
	const ss = 4
	img := image.NewNRGBA(image.Rect(0, 0, n, n))
	teal := color.NRGBA{R: 0x0F, G: 0x76, B: 0x6E, A: 255}
	tealOscuro := color.NRGBA{R: 0x0B, G: 0x54, B: 0x4E, A: 255}
	ambar := color.NRGBA{R: 0xF5, G: 0x9E, B: 0x0B, A: 255}
	blanco := color.NRGBA{R: 0xFF, G: 0xFF, B: 0xFF, A: 255}

	radio := float64(n) * 0.22 // esquina redondeada

	// alturas relativas de las 5 barras (forma de onda)
	alturas := []float64{0.32, 0.58, 0.86, 0.58, 0.32}

	dentro := func(x, y float64) (color.NRGBA, bool) {
		// rectángulo redondeado
		enBordeRedondeado := func(cx, cy, r float64) float64 {
			dx, dy := x-cx, y-cy
			d := math.Sqrt(dx*dx + dy*dy)
			return d - r // <0 dentro
		}
		m := float64(n) - 1.0
		dentroRect := x >= radio && x <= m-radio || y >= radio && y <= m-radio
		dentroEsq := false
		if x < radio && y < radio && enBordeRedondeado(radio, radio, radio) < 0 {
			dentroEsq = true
		}
		if x > m-radio && y < radio && enBordeRedondeado(m-radio, radio, radio) < 0 {
			dentroEsq = true
		}
		if x < radio && y > m-radio && enBordeRedondeado(radio, m-radio, radio) < 0 {
			dentroEsq = true
		}
		if x > m-radio && y > m-radio && enBordeRedondeado(m-radio, m-radio, radio) < 0 {
			dentroEsq = true
		}
		if !(dentroRect || dentroEsq) {
			return color.NRGBA{}, false
		}
		// degradado sutil teal → teal oscuro (vertical)
		t := y / m
		c := mezclar(teal, tealOscuro, t)
		// barras
		nBarras := 5
		frac := 0.62 // área de barras
		x0 := m * (1 - frac) / 2
		anchoBarra := m * frac / float64(nBarras)
		if x >= x0 && x <= x0+frac*m {
			i := int((x - x0) / anchoBarra)
			if i >= 0 && i < nBarras {
				cx := x0 + anchoBarra*float64(i) + anchoBarra/2
				med := (x - (x0 + anchoBarra*float64(i))) / anchoBarra // 0..1 dentro de la barra
				grosor := 0.42
				if med > grosor/2 && med < 1-grosor/2 {
					h := alturas[i] * m * 0.72
					cy := m / 2
					if y > cy-h/2 && y < cy+h/2 {
						if i == 2 {
							// barra central con núcleo ámbar
							nucleo := anchoBarra * 0.18
							if math.Abs(x-cx) < nucleo {
								return ambar, true
							}
						}
						return blanco, true
					}
				}
			}
		}
		return c, true
	}

	// supersample
	for py := 0; py < n; py++ {
		for px := 0; px < n; px++ {
			var r, g, b, a, cuenta float64
			for sy := 0; sy < ss; sy++ {
				for sx := 0; sx < ss; sx++ {
					x := float64(px) + (float64(sx)+0.5)/ss - 0.5
					y := float64(py) + (float64(sy)+0.5)/ss - 0.5
					if c, ok := dentro(x, y); ok {
						r += float64(c.R)
						g += float64(c.G)
						b += float64(c.B)
						a += float64(c.A)
					}
					cuenta++
				}
			}
			if a == 0 {
				img.SetNRGBA(px, py, color.NRGBA{A: 0})
			} else {
				img.SetNRGBA(px, py, color.NRGBA{
					R: uint8(r / cuenta),
					G: uint8(g / cuenta),
					B: uint8(b / cuenta),
					A: uint8(a / cuenta),
				})
			}
		}
	}
	return img
}

func mezclar(a, b color.NRGBA, t float64) color.NRGBA {
	return color.NRGBA{
		R: uint8(float64(a.R)*(1-t) + float64(b.R)*t),
		G: uint8(float64(a.G)*(1-t) + float64(b.G)*t),
		B: uint8(float64(a.B)*(1-t) + float64(b.B)*t),
		A: 255,
	}
}

// icoBMP codifica una imagen como entrada BMP de ICO (BGRA + máscara AND).
func icoBMP(img image.Image) []byte {
	rect := img.Bounds()
	w, h := rect.Dx(), rect.Dy()
	var buf bytes.Buffer
	// BITMAPINFOHEADER con height = 2*h (XOR + AND)
	binary.Write(&buf, binary.LittleEndian, uint32(40))
	binary.Write(&buf, binary.LittleEndian, int32(w))
	binary.Write(&buf, binary.LittleEndian, int32(h*2))
	binary.Write(&buf, binary.LittleEndian, uint16(1))
	binary.Write(&buf, binary.LittleEndian, uint16(32))
	binary.Write(&buf, binary.LittleEndian, uint32(0))
	binary.Write(&buf, binary.LittleEndian, uint32(w*h*4))
	binary.Write(&buf, binary.LittleEndian, int32(0))
	binary.Write(&buf, binary.LittleEndian, int32(0))
	binary.Write(&buf, binary.LittleEndian, uint32(0))
	binary.Write(&buf, binary.LittleEndian, uint32(0))
	// píxeles bottom-up BGRA
	for y := h - 1; y >= 0; y-- {
		for x := 0; x < w; x++ {
			r, g, b, a := img.At(rect.Min.X+x, rect.Min.Y+y).RGBA()
			buf.Write([]byte{uint8(b >> 8), uint8(g >> 8), uint8(r >> 8), uint8(a >> 8)})
		}
	}
	// máscara AND (todo 0 = confiar en el alpha)
	filas := (w + 31) / 32 * 4
	ceros := make([]byte, filas)
	for y := 0; y < h; y++ {
		buf.Write(ceros)
	}
	return buf.Bytes()
}

// icoPNG codifica una imagen como entrada PNG de ICO.
func icoPNG(img image.Image) []byte {
	var buf bytes.Buffer
	png.Encode(&buf, img)
	return buf.Bytes()
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("uso: genicon salida.ico")
		os.Exit(1)
	}
	salida := os.Args[1]

	type entrada struct {
		tam   int
		datos []byte
		png   bool
	}
	var entradas []entrada
	for _, tam := range []int{16, 32, 48} {
		entradas = append(entradas, entrada{tam, icoBMP(pinta(tam)), false})
	}
	for _, tam := range []int{64, 128, 256} {
		entradas = append(entradas, entrada{tam, icoPNG(pinta(tam)), true})
	}

	var ico bytes.Buffer
	binary.Write(&ico, binary.LittleEndian, uint16(0)) // reserved
	binary.Write(&ico, binary.LittleEndian, uint16(1)) // type icon
	binary.Write(&ico, binary.LittleEndian, uint16(len(entradas)))

	offset := 6 + 16*len(entradas)
	var datos bytes.Buffer
	for _, e := range entradas {
		b := e.datos
		w := uint8(e.tam)
		if e.tam == 256 {
			w = 0
		}
		ico.Write([]byte{w, w, 0, 0, 1, 0, 32, 0})
		binary.Write(&ico, binary.LittleEndian, uint32(len(b)))
		binary.Write(&ico, binary.LittleEndian, uint32(offset))
		datos.Write(b)
		offset += len(b)
	}
	ico.Write(datos.Bytes())

	if err := os.MkdirAll(filepath.Dir(salida), 0755); err != nil {
		panic(err)
	}
	if err := os.WriteFile(salida, ico.Bytes(), 0644); err != nil {
		panic(err)
	}
	fmt.Printf("icono escrito: %s (%d bytes)\n", salida, ico.Len())
}
