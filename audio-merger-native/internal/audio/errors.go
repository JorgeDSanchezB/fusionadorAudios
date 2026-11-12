// Package audio implementa el motor de fusión: detección de formato,
// decodificación a PCM float32, normalización y escritura WAV/MP3.
package audio

import (
	"errors"
	"fmt"
)

// Codigo de error estable (paridad conceptual con la librería web).
type Codigo string

const (
	CodigoUnsupportedFormat Codigo = "UNSUPPORTED_FORMAT"
	CodigoFileTooLarge      Codigo = "FILE_TOO_LARGE"
	CodigoTooManyTracks     Codigo = "TOO_MANY_TRACKS"
	CodigoTotalTooLarge     Codigo = "TOTAL_TOO_LARGE"
	CodigoReadFailed        Codigo = "READ_FAILED"
	CodigoDecodeFailed      Codigo = "DECODE_FAILED"
	CodigoParamMismatch     Codigo = "PARAM_MISMATCH"
	CodigoNoTracks          Codigo = "NO_TRACKS"
	CodigoInvalidOrder      Codigo = "INVALID_ORDER"
	CodigoInvalidOptions    Codigo = "INVALID_OPTIONS"
	CodigoUserCancelled     Codigo = "USER_CANCELLED"
	CodigoWriteFailed       Codigo = "WRITE_FAILED"
	CodigoUnknown           Codigo = "UNKNOWN_ERROR"
)

// Error es el error tipado del motor.
type Error struct {
	Codigo  Codigo
	Mensaje string // texto final en castellano (plantilla de i18n ya aplicada)
	Causa   error  // causa técnica original, si la hay
}

func (e *Error) Error() string {
	if e.Causa != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Codigo, e.Mensaje, e.Causa)
	}
	return fmt.Sprintf("%s: %s", e.Codigo, e.Mensaje)
}

func (e *Error) Unwrap() error { return e.Causa }

// nuevoError construye un Error con mensaje ya formateado.
func nuevoError(c Codigo, formato string, args ...any) *Error {
	return &Error{Codigo: c, Mensaje: fmt.Sprintf(formato, args...)}
}

// conCausa adjunta la causa técnica.
func (e *Error) conCausa(c error) *Error {
	e.Causa = c
	return e
}

// Clasifica envuelve errores de terceros con el código indicado.
func Clasifica(c Codigo, causa error, formato string, args ...any) *Error {
	return nuevoError(c, formato, args...).conCausa(causa)
}

// DeCodigo indica si err es un *Error con el código dado.
func DeCodigo(err error, c Codigo) bool {
	var e *Error
	if errors.As(err, &e) {
		return e.Codigo == c
	}
	return false
}

// AsError es errors.As acotado a *Error.
func AsError(err error, dst **Error) bool {
	return errors.As(err, dst)
}
