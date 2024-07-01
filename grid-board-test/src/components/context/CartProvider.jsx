import { useState, createContext, useEffect } from "react";
export const CartContext = createContext();

export default function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const cartState = {
    cartItems,
    setCartItems,
    categories,
    setCategories,
    isDarkMode,
    setIsDarkMode,
  };

  useEffect(() => {
    fetch("https://fakestoreapi.com/products")
      .then((res) => res.json())
      .then((json) => {
        const items = [];
        json.forEach((product) => {
          const itemObj = {
            count: 0,
            product: product,
            orderAddedId: 0,
          };
          items.push(itemObj);
        });
        setCartItems(items);
      })
      .catch((err) => {
        console.error("Get Products Error: ", err);
      });
  }, []);

  useEffect(() => {
    fetch("https://fakestoreapi.com/products/categories")
      .then((res) => res.json())
      .then((json) => {
        const newCategories = [];
        for (let i = 0; i < json.length; i++) {
          const categoryObject = {
            id: i + 1,
            name: json[i],
          };
          newCategories.push(categoryObject);
        }
        setCategories(newCategories);
      })
      .catch((err) => console.error("Get Categories Error: ", err));
  }, []);

  return (
    <CartContext.Provider value={cartState}>{children}</CartContext.Provider>
  );
}
