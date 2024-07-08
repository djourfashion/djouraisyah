document.addEventListener("DOMContentLoaded", async () => {
  const userLogin = JSON.parse(localStorage.getItem("user"));
  const cartContainer = document.getElementById("cart");
  const totalContainer = document.getElementById("total");
  const checkoutButton = document.getElementById("checkout-button");
  const backhomeButton = document.getElementById("backhome-button");
  const popupForm = document.getElementById("popup-form");
  const closeButton = document.querySelector(".close-button");
  const checkoutForm = document.getElementById("checkoutForm");
  const totalPurchase = document.getElementById("total-purchase");

  backhomeButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  try {
    const response = await fetch(
      `http://localhost:3000/api/cart/get-cart/${userLogin.id}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch cart data");
    }

    let cartItems = await response.json();
    console.log(cartItems);

    if (cartItems.length === 0) {
      checkoutButton.style.display = "none";
      backhomeButton.style.display = "none";
      displayEmptyCartMessage();
      return;
    }

    function displayEmptyCartMessage() {
      cartContainer.innerHTML = `
      <div class="empty-cart">
        <p>Maaf, keranjang kosong</p>
        <button id="continue-shopping">Lanjut Belanja</button>
      </div>
    `;

      document
        .getElementById("continue-shopping")
        .addEventListener("click", () => {
          window.location.href = "index.html";
        });
    }

    let total = 0;

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Nama Produk</th>
          <th>Harga</th>
          <th>Jumlah</th>
          <th>Sub Total</th>
        </tr>
      </thead>
      <tbody></tbody>
      <tfoot>
        <tr>
          <td colspan="3">Total</td>
          <td id="total-amount"></td>
        </tr>
      </tfoot>
    `;

    const tbody = table.querySelector("tbody");

    cartItems.forEach((item) => {
      const { id, product_name, price, quantity } = item;
      const subTotal = price * quantity;
      total += subTotal;

      const row = document.createElement("tr");
      row.dataset.itemId = id; // Tambahkan data attribute untuk menyimpan id item
      row.innerHTML = `
        <td>${product_name}</td>
        <td>Rp${price.toLocaleString()}</td>
        <td>
          <div class="quantity-controls">
            <button class="decrease">-</button>
            <input type="number" value="${quantity}" min="1" readonly>
            <button class="increase">+</button>
          </div>
        </td>
        <td>Rp${subTotal.toLocaleString()}</td>
      `;
      tbody.appendChild(row);
    });

    cartContainer.appendChild(table);
    document.getElementById(
      "total-amount"
    ).textContent = `Rp${total.toLocaleString()}`;
    totalPurchase.textContent = `Rp${total.toLocaleString()}`;

    // Event listeners for quantity buttons
    document.querySelectorAll(".quantity-controls").forEach((control) => {
      const decreaseBtn = control.querySelector(".decrease");
      const increaseBtn = control.querySelector(".increase");
      const quantityInput = control.querySelector("input");
      const itemId = control.closest("tr").dataset.itemId;

      decreaseBtn.addEventListener("click", async () => {
        let quantity = parseInt(quantityInput.value);
        if (quantity > 1) {
          quantity--;
          quantityInput.value = quantity;
          updateSubTotal(control, quantity);
          await updateCartQuantity(itemId, quantity); // Update kuantitas di database
        } else if (quantity === 1) {
          quantityInput.value = quantity - 1; // Set nilai quantityInput sebelum penghapusan
          await deleteCartItem(itemId); // Hapus item dari keranjang di database
          control.closest("tr").remove(); // Hapus baris dari tabel secara lokal
          recalculateTotal(); // Hitung ulang total setelah penghapusan
        }
      });

      increaseBtn.addEventListener("click", async () => {
        let quantity = parseInt(quantityInput.value);
        quantity++;
        quantityInput.value = quantity;
        updateSubTotal(control, quantity);
        await updateCartQuantity(itemId, quantity); // Update kuantitas di database
      });
    });

    // Show the popup form on checkout button click
    checkoutButton.addEventListener("click", () => {
      popupForm.style.display = "block";
    });

    // Close the popup form
    closeButton.addEventListener("click", () => {
      popupForm.style.display = "none";
    });

    // Close the popup form when clicking outside of it
    window.addEventListener("click", (event) => {
      if (event.target === popupForm) {
        popupForm.style.display = "none";
      }
    });

    // Handle the form submission
    checkoutForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      alert("Pemesanan berhasil dilakukan");
      popupForm.style.display = "none";
      const name = document.querySelector(".input-name").value;
      const phone_number = document.querySelector(".input-name").value;
      const address = document.querySelector(".input-address").value;
      const payment_method = document.querySelector(".input-payment").value;
      const shipping_method = document.querySelector(".input-shipping").value;

      // console.log({
      //   sales: cartItems,
      //   name,
      //   phone_number,
      //   address,
      //   payment_method,
      //   shipping_method,
      // });
      try {
        const response = await fetch(
          `http://localhost:3000/api/sale/checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sales: cartItems,
              name,
              phone_number,
              address,
              payment_method,
              shipping_method,
            }),
          }
        );
        if (!response.ok) {
          throw new Error("Failed to update cart item quantity");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    });

    function updateSubTotal(control, quantity) {
      const row = control.closest("tr");
      const priceCell = row.children[1];
      const subTotalCell = row.children[3];
      const price = parseInt(priceCell.textContent.replace(/[^\d]/g, ""));
      const subTotal = price * quantity;
      subTotalCell.textContent = `Rp${subTotal.toLocaleString()}`;
      recalculateTotal(); // Hitung ulang total setiap kali sub total diperbarui
    }

    async function updateCartQuantity(itemId, quantity) {
      try {
        const response = await fetch(
          `http://localhost:3000/api/cart/update-quantity/${itemId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ quantity }),
          }
        );
        if (!response.ok) {
          throw new Error("Failed to update cart item quantity");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }

    async function deleteCartItem(itemId) {
      try {
        const response = await fetch(
          `http://localhost:3000/api/cart/delete-item/${itemId}`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) {
          throw new Error("Failed to delete cart item");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }

    function recalculateTotal() {
      let total = 0;
      document.querySelectorAll("tbody tr").forEach((row) => {
        const subTotal = parseInt(
          row.children[3].textContent.replace(/[^\d]/g, "")
        );
        total += subTotal;
      });
      document.getElementById(
        "total-amount"
      ).textContent = `Rp${total.toLocaleString()}`;
      totalPurchase.textContent = `Rp${total.toLocaleString()}`;
    }
  } catch (error) {
    console.error("Error:", error);
    cartContainer.innerHTML =
      "<p>Gagal mengambil data keranjang. Silakan coba lagi nanti.</p>";
    totalContainer.innerHTML = "";
  }
});
