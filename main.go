package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"go-pos/models"
	"os"
	"strings"
	"html/template"
	"net/http"
)

var products []models.Product
var sales []models.Sale
var reader = bufio.NewReader(os.Stdin)

func main() {
	http.HandleFunc("/", HomeHandler)
	http.HandleFunc("/products", ProductsHandler)

	fmt.Println("Server running on http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
// hadalers
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.ParseFiles("templates/index.html"))
	tmpl.Execute(w, nil)
}
func ProductsHandler(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.ParseFiles("templates/products.html"))
	tmpl.Execute(w, products)
}
// functions
func AddProduct() {
	var p models.Product

	fmt.Print("Enter Product ID: ")
	fmt.Scanln(&p.ID)

	if ProductIDExists(p.ID) {
		fmt.Println("Product ID already exists. Use a different ID.")
		return
	}


	reader.ReadString('\n')
	fmt.Print("Enter Product Name: ")
	name, _ := reader.ReadString('\n')
	p.Name = strings.TrimSpace(name)

	fmt.Print("Enter Price: ")
	fmt.Scanln(&p.Price)

	fmt.Print("Enter Stock: ")
	fmt.Scanln(&p.Stock)

	products = append(products, p)
	SaveProductsToFile()

	fmt.Println("Product added successfully!")
}

func ViewProducts() {
	if len(products) == 0 {
		fmt.Println("No products available.")
		return
	}

	fmt.Println("\n--- Product List ---")
	for _, p := range products {
		fmt.Printf("ID: %d | Name: %s | Price: %.2f | Stock: %d\n",
			p.ID, p.Name, p.Price, p.Stock)
	}
}

func FindProductByID(id int) *models.Product {
	for i := range products {
		if products[i].ID == id {
			return &products[i]
		}
	}
	return nil
}

func NewSale() {
	if len(products) == 0 {
		fmt.Println("No products available. Add products first.")
		return
	}

	var cart []models.CartItem

	for {
		ViewProducts()

		var id int
		fmt.Print("Enter Product ID (0 to finish): ")
		fmt.Scanln(&id)

		if id == 0 {
			break
		}

		product := FindProductByID(id)
		if product == nil {
			fmt.Println("Product not found")
			continue
		}

		var qty int
		fmt.Print("Enter Quantity: ")
		fmt.Scanln(&qty)

		if qty <= 0 {
			fmt.Println("Quantity must be greater than 0")
			continue
		}

		if qty > product.Stock {
			fmt.Println("Not enough stock")
			continue
		}

		cart = append(cart, models.CartItem{
			Product:  *product,
			Quantity: qty,
		})
	}

	if len(cart) == 0 {
		fmt.Println("No items in sale.")
		return
	}

	total := CalculateTotal(cart)

	fmt.Println("\n--- Receipt ---")
	for _, item := range cart {
		subtotal := item.Product.Price * float64(item.Quantity)
		fmt.Printf("%s x%d = %.2f\n", item.Product.Name, item.Quantity, subtotal)
	}
	fmt.Printf("TOTAL: %.2f\n", total)

	UpdateStock(cart)
	SaveProductsToFile()

	sale := models.Sale{
		Items: cart,
		Total: total,
	}

	sales = append(sales, sale)
	SaveSalesToFile()

	fmt.Println("Sale completed successfully!")
}
func DeleteProduct() {
	if len(products) == 0 {
		fmt.Println("No products available.")
		return
	}

	ViewProducts()

	var id int
	fmt.Print("Enter Product ID to delete: ")
	fmt.Scanln(&id)

	index := -1
	for i, p := range products {
		if p.ID == id {
			index = i
			break
		}
	}

	if index == -1 {
		fmt.Println("Product not found.")
		return
	}

	products = append(products[:index], products[index+1:]...)
	SaveProductsToFile()

	fmt.Println("Product deleted successfully!")
}

func CalculateTotal(items []models.CartItem) float64 {
	var total float64
	for _, item := range items {
		total += item.Product.Price * float64(item.Quantity)
	}
	return total
}

func UpdateStock(items []models.CartItem) {
	for _, item := range items {
		for i := range products {
			if products[i].ID == item.Product.ID {
				fmt.Printf("Before update: %s stock = %d\n", products[i].Name, products[i].Stock)
				products[i].Stock -= item.Quantity
				fmt.Printf("After update: %s stock = %d\n", products[i].Name, products[i].Stock)
			}
		}
	}
}
func UpdateProduct() {
	if len(products) == 0 {
		fmt.Println("No products available.")
		return
	}

	ViewProducts()

	var id int
	fmt.Print("Enter Product ID to update: ")
	fmt.Scanln(&id)

	product := FindProductByID(id)
	if product == nil {
		fmt.Println("Product not found.")
		return
	}

	reader.ReadString('\n')

	fmt.Print("Enter new name: ")
	name, _ := reader.ReadString('\n')
	product.Name = strings.TrimSpace(name)

	fmt.Print("Enter new price: ")
	fmt.Scanln(&product.Price)

	fmt.Print("Enter new stock: ")
	fmt.Scanln(&product.Stock)

	SaveProductsToFile()

	fmt.Println("Product updated successfully!")
}

func SaveProductsToFile() {
	file, err := os.Create("data/products.json")
	if err != nil {
		fmt.Println("Error saving products:", err)
		return
	}
	defer file.Close()

	err = json.NewEncoder(file).Encode(products)
	if err != nil {
		fmt.Println("Error encoding products:", err)
	}
}

func LoadProductsFromFile() {
	file, err := os.Open("data/products.json")
	if err != nil {
		return
	}
	defer file.Close()

	err = json.NewDecoder(file).Decode(&products)
	if err != nil {
		fmt.Println("Error loading products:", err)
	}
}

func SaveSalesToFile() {
	file, err := os.Create("data/sales.json")
	if err != nil {
		fmt.Println("Error saving sales:", err)
		return
	}
	defer file.Close()

	err = json.NewEncoder(file).Encode(sales)
	if err != nil {
		fmt.Println("Error encoding sales:", err)
	}
}
func LoadSalesFromFile() {
	file, err := os.Open("data/sales.json")
	if err != nil {
		return
	}
	defer file.Close()

	json.NewDecoder(file).Decode(&sales)
}
func ViewSales() {
	if len(sales) == 0 {
		fmt.Println("No sales available.")
		return
	}

	fmt.Println("\n--- Sales History ---")

	for i, sale := range sales {
		fmt.Printf("\nSale #%d\n", i+1)

		for _, item := range sale.Items {
			fmt.Printf("%s x%d = %.2f\n",
				item.Product.Name,
				item.Quantity,
				item.Product.Price*float64(item.Quantity))
		}

		fmt.Printf("Total: %.2f\n", sale.Total)
	}
}
func ProductIDExists(id int) bool {
	for _, p := range products {
		if p.ID == id {
			return true
		}
	}
	return false
}
