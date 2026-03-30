package models

type Product struct {
	ID    int
	Name  string
	Price float64
	Stock int
}

type CartItem struct {
	Product  Product
	Quantity int
}

type Sale struct {
	Items []CartItem
	Total float64
}