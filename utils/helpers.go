package utils

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
)

var ErrMissingField = errors.New("missing field")

func IntFormValue(r *http.Request, key string) (int, error) {
	value := strings.TrimSpace(r.FormValue(key))
	if value == "" {
		return 0, ErrMissingField
	}
	return strconv.Atoi(value)
}

func OptionalIntFormValue(r *http.Request, key string) (int, error) {
	value := strings.TrimSpace(r.FormValue(key))
	if value == "" {
		return 0, nil
	}
	return strconv.Atoi(value)
}

func FloatFormValue(r *http.Request, key string) (float64, error) {
	value := strings.TrimSpace(r.FormValue(key))
	if value == "" {
		return 0, ErrMissingField
	}
	return strconv.ParseFloat(value, 64)
}
