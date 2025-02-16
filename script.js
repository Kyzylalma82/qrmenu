document.addEventListener("DOMContentLoaded", async function() {
  // Глобальный массив для хранения заказанных блюд
  let orders = [];

  // Локальный словарь для сопоставления категорий и изображений
  const categoryImages = {
    "hot": "images/hot.jpg",
    "pizza": "images/pizza.jpg",
    "soups": "images/soups.jpg",
    "salads": "images/salads.jpg",
    "side": "images/side.jpg",
    "drinks": "images/drinks.jpg",
    "desserts": "images/desserts.jpg",
    "extra": "images/extra.jpg"
  };

  // Функция для преобразования русского названия категории в ключ словаря
  function mapCategoryName(name) {
    const mapping = {
      "горячие блюда": "hot",
      "восточное блюдо": "hot",
      "супы": "soups",
      "салаты": "salads",
      "гарниры": "side",
      "напитки": "drinks",
      "десерты": "desserts",
      "дополнительно": "extra",
      "пицца 30 см": "pizza",
      "пицца": "pizza"
    };
    return mapping[name.toLowerCase()] || name.toLowerCase();
  }

  // Функция для загрузки категорий
  async function loadCategories() {
    try {
      const response = await fetch('http://localhost:3000/api/categories');
      const categories = await response.json();
      console.log('Загруженные категории:', categories);

      const container = document.getElementById('categories-cards-container');
      if (container) {
        container.innerHTML = "";
        categories.forEach(cat => {
          const card = document.createElement('div');
          card.classList.add('category-card');

          const categoryKey = mapCategoryName(cat.name);
          let subcategory = "";
          if (categoryKey === "pizza") {
            subcategory = "pizza30";
          }
          card.dataset.category = categoryKey;
          if (subcategory) {
            card.dataset.subcategory = subcategory;
          }

          card.style.backgroundImage = `url('${cat.imageUrl || categoryImages[categoryKey] || "images/default.jpg"}')`;
          card.innerHTML = `<div class="overlay"><h3>${cat.name}</h3></div>`;
          // При клике по карточке категории показываем блюда выбранной категории
          card.addEventListener('click', () => showMenuItems(categoryKey, subcategory));
          container.appendChild(card);
        });
        addCategoryCardListeners();
      }
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  }

  // Функция для загрузки блюд
  async function loadDishes() {
    try {
      const response = await fetch('http://localhost:3000/api/menu');
      const dishes = await response.json();
      console.log('Загруженные блюда:', dishes);

      const itemsList = document.querySelector('.items-list');
      if (itemsList) {
        itemsList.innerHTML = "";
        dishes.forEach(dish => {
          const item = document.createElement('div');
          item.classList.add('menu-item');

          const mappedCategory = dish.categoryName ? mapCategoryName(dish.categoryName) : "";
          item.dataset.category = mappedCategory;
          if (mappedCategory === "pizza") {
            item.dataset.subcategory = "pizza30";
          }

          let imageUrl = dish.image_path;
          if (imageUrl) {
            imageUrl = imageUrl.replace("C:\\cafe_app\\bludim\\", "images/");
          } else {
            imageUrl = "images/default-dish.jpg";
          }

          // Выводим карточку блюда без описания – только изображение, название, цена, вес и количество,
          // а кнопку «+» для добавления в заказы.
          item.innerHTML = `
            <img src="${imageUrl}" alt="${dish.name}">
            <h3>${dish.name}</h3>
            <p>Цена: ${dish.price} сом</p>
            <p>Вес: ${dish.weight} г, Количество: ${dish.quantity} шт</p>
            <button class="add-to-order">+</button>
          `;
          // Сохраняем описание и путь к изображению для модального окна (если нужно)
          item.dataset.description = dish.description;
          item.dataset.imageUrl = imageUrl;
          item.dataset.id = dish.id;
          itemsList.appendChild(item);

          console.log(`Добавлено блюдо: ${dish.name} | categoryName: ${dish.categoryName} | mappedCategory: ${mappedCategory}`);
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки блюд:', error);
    }
  }

  // Функция для показа блюд по выбранной категории
  function showMenuItems(category, subcategory = "") {
    // Скрываем info-card при переходе к блюдам
    const infoCard = document.querySelector('.info-card');
    if (infoCard) {
      infoCard.style.display = "none";
    }
    // Скрываем контейнер категорий
    document.getElementById('categories-cards-container').style.display = "none";
    // Показываем раздел с блюдами
    document.getElementById('menu-items').style.display = "block";
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      const itemCat = item.dataset.category;
      const itemSub = item.dataset.subcategory || "";
      item.style.display = (itemCat === category && (subcategory === "" || itemSub === subcategory))
        ? "block"
        : "none";
    });
  }
  

  // Функция для показа списка заказов в модальном окне
  function showOrdersModal() {
    const orderModal = document.getElementById('order-modal');
    const orderDetails = document.getElementById('order-details');
    let html = "<h2>Ваши заказы</h2>";
    if (orders.length === 0) {
      html += "<p>Заказов пока нет.</p>";
    } else {
      orders.forEach((order, index) => {
        html += `
          <div class="order-item">
            <img src="${order.imageUrl}" alt="${order.name}">
            <div class="order-info">
              <p><strong>${order.name}</strong></p>
              <p>Цена: ${order.price} сом</p>
              <p>Вес: ${order.weight} г, Количество: ${order.quantity} шт</p>
            </div>
            <div class="order-actions">
              <button data-index="${index}" class="increment-order">+</button>
              <button data-index="${index}" class="decrement-order">-</button>
              <button data-index="${index}" class="remove-order">Удалить</button>
            </div>
          </div>
        `;
      });
    }
    orderDetails.innerHTML = html;
    orderModal.style.display = "block";
    addOrderActionListeners();
  }

  // Функция для обновления счётчика заказов на кнопке "Заказы"
  function updateOrdersCount() {
    const ordersButton = document.querySelector('.info-btn[data-category="orders"]');
    if (ordersButton) {
      const total = orders.reduce((acc, order) => acc + order.quantity, 0);
      // Находим элемент-счётчик внутри кнопки
      let countSpan = ordersButton.querySelector('.orders-count');
      if (!countSpan) {
        // Если его нет, создаём его, не затрагивая остальную разметку (иконку)
        countSpan = document.createElement('span');
        countSpan.classList.add('orders-count');
        ordersButton.appendChild(countSpan);
      }
      // Обновляем только текст счётчика
      countSpan.textContent = `${total}`;
    }
    updateDishCardsUI();
  }
  
  
  
  
  
  // Функция для добавления блюда в заказы (без открытия модального окна)
  function addToOrder(dish) {
    const existing = orders.find(o => o.id === dish.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      orders.push({ ...dish, quantity: 1 });
    }
    updateOrdersCount();
    console.log("Заказы:", orders);
  }
  

  // Функция для добавления обработчиков действий внутри модального окна заказов
  function addOrderActionListeners() {
    const removeButtons = document.querySelectorAll('.remove-order');
    const incrementButtons = document.querySelectorAll('.increment-order');
    const decrementButtons = document.querySelectorAll('.decrement-order');

    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.dataset.index;
        orders.splice(index, 1);
        showOrdersModal();
        updateOrdersCount();
      });
    });

    incrementButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.dataset.index;
        orders[index].quantity += 1;
        showOrdersModal();
        updateOrdersCount();
      });
    });

    decrementButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.dataset.index;
        if (orders[index].quantity > 1) {
          orders[index].quantity -= 1;
        } else {
          orders.splice(index, 1);
        }
        showOrdersModal();
        updateOrdersCount();
      });
    });
  }

  // Функция для добавления обработчиков для статичных info-кнопок (таб-бар)
  function addInfoButtonListeners() {
    const infoButtons = document.querySelectorAll('.info-btn');
    infoButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Убираем класс active у всех кнопок и добавляем его для нажатой кнопки
        infoButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
  
        // Если это кнопка "Главное меню"
        if (btn.dataset.action === "categories") {
          // Показываем главный экран – баннер, info-card и категории
          document.querySelector('.banner').style.display = "block";
          document.querySelector('.info-card').style.display = "block";
          document.getElementById('categories-cards-container').style.display = "flex";
          document.getElementById('menu-items').style.display = "none";
          window.scrollTo(0, 0);
        } else {
          // Для остальных кнопок (например, Пицца, Напитки, Заказы)
          // Скрываем info-card (главный экран)
          document.querySelector('.info-card').style.display = "none";
          // Если это Заказы, открываем модальное окно заказов
          if (btn.dataset.category === "orders") {
            showOrdersModal();
          } else {
            // Для категорий блюд (Пицца, Напитки и т.д.)
            document.getElementById('categories-cards-container').style.display = "none";
            document.getElementById('menu-items').style.display = "block";
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
              if (item.dataset.category === btn.dataset.category) {
                item.style.display = "block";
              } else {
                item.style.display = "none";
              }
            });
          }
        }
      });
    });
  }
  
  
  

  // Функция для добавления обработчиков для модального окна блюд (открывается при клике на блюдо, не на плюс)
  function addDishModalListeners() {
    const dishItems = document.querySelectorAll('.menu-item');
    const modal = document.getElementById('dish-modal');
    const modalContent = document.getElementById('dish-details');
    const modalClose = document.getElementById('modal-close');
  
    dishItems.forEach(item => {
      // Открываем модальное окно при клике по блюду (если клик не по кнопке +)
      item.addEventListener('click', (e) => {
        // Если клик по кнопке добавления в заказ (на карточке), не открываем модальное окно
        if (e.target.classList.contains('add-to-order')) return;
  
        const dishName = item.querySelector('h3').textContent;
        const dishDescription = item.dataset.description || "";
        const dishPrice = item.querySelector('p').textContent; // первая строка цены
        const dishImageHTML = item.querySelector('img').outerHTML;
        // Формируем базовый контент модального окна
        modalContent.innerHTML = `
          <h2>${dishName}</h2>
          ${dishImageHTML}
          <p>${dishDescription}</p>
          <p>${dishPrice}</p>
          <button class="add-to-order">+</button>
        `;
        modal.style.display = "block";
  
        // Получаем кнопку добавления в модальном окне
        const modalAddButton = modalContent.querySelector('.add-to-order');
        // Привязываем обработчик к кнопке внутри модального окна
        modalAddButton.addEventListener('click', (e) => {
          e.stopPropagation();
          // Если панель управления уже добавлена, ничего не делаем
          if (modalContent.querySelector('.quantity-controls')) return;
  
          // Собираем данные блюда из модального окна
          const dish = {
            id: item.dataset.id || dishName,
            name: dishName,
            price: dishPrice.replace("Цена: ", "").replace(" сом", ""),
            weight: item.querySelector('p:nth-of-type(2)') 
                      ? item.querySelector('p:nth-of-type(2)').textContent.match(/Вес:\s*(\d+)/)?.[1] || ""
                      : "",
            quantity: 1,
            description: dishDescription,
            imageUrl: item.dataset.imageUrl
          };
          // Добавляем блюдо в заказы (если уже есть, увеличиваем количество)
          addToOrder(dish);
          updateOrdersCount();
  
          // Удаляем кнопку + из модального окна
          modalAddButton.remove();
  
          // Создаем панель управления количеством
          const quantityControls = document.createElement('div');
          quantityControls.classList.add('quantity-controls');
          quantityControls.innerHTML = `
            <button class="decrement">-</button>
            <span class="quantity">1</span>
            <button class="increment">+</button>
          `;
          modalContent.appendChild(quantityControls);
  
          const incrementBtn = quantityControls.querySelector('.increment');
          const decrementBtn = quantityControls.querySelector('.decrement');
          const quantitySpan = quantityControls.querySelector('.quantity');
  
          // Обработчик для кнопки "+" в модальном окне
          incrementBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const existing = orders.find(o => o.id === dish.id);
            if (existing) {
              existing.quantity += 1;
              quantitySpan.textContent = existing.quantity;
              updateOrdersCount();
            }
          });
  
          // Обработчик для кнопки "–" в модальном окне
          decrementBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const existing = orders.find(o => o.id === dish.id);
            if (existing) {
              if (existing.quantity > 1) {
                existing.quantity -= 1;
                quantitySpan.textContent = existing.quantity;
              } else {
                orders = orders.filter(o => o.id !== dish.id);
                quantityControls.remove();
                // Восстанавливаем кнопку +, чтобы можно было добавить блюдо снова
                const newAddBtn = document.createElement('button');
                newAddBtn.classList.add('add-to-order');
                newAddBtn.textContent = "+";
                modalContent.appendChild(newAddBtn);
                // Привяжем обработчик, используя addDishModalListeners (или напрямую)
                newAddBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  // Повторно вызываем обработчик для панели (рекурсивно можно вызвать ту же логику)
                  addDishModalListeners(); // или перезагрузить модальное окно
                });
              }
              updateOrdersCount();
            }
          });
        });
      });
    });
  
    modalClose.addEventListener('click', () => {
      modal.style.display = "none";
    });
  
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  
    let touchStartY = 0;
    let touchEndY = 0;
  
    modal.addEventListener('touchstart', function(e) {
      touchStartY = e.changedTouches[0].screenY;
    });
  
    modal.addEventListener('touchend', function(e) {
      touchEndY = e.changedTouches[0].screenY;
      if (touchEndY - touchStartY > 50) {
        modal.style.display = "none";
      }
    });
  }
  
  // Функция для добавления обработчиков для кнопки "add-to-order" внутри карточки блюда (без открытия модального окна)
  function addAddToOrderListeners() {
    const addButtons = document.querySelectorAll('.menu-item .add-to-order');
    addButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.menu-item');
        
        // Если уже есть панель управления количеством, ничего не делаем
        if (item.querySelector('.quantity-controls')) return;
        
        // Собираем данные блюда
        const dish = {
          id: item.dataset.id || item.querySelector('h3').textContent,
          name: item.querySelector('h3').textContent,
          price: item.querySelector('p').textContent.replace("Цена: ", "").replace(" сом", ""),
          weight: item.querySelector('p:nth-of-type(2)') 
                  ? item.querySelector('p:nth-of-type(2)').textContent.match(/Вес:\s*(\d+)/)?.[1] || ""
                  : "",
          quantity: 1,
          description: item.dataset.description || "",
          imageUrl: item.dataset.imageUrl
        };
        
        // Добавляем блюдо в заказы (если уже есть — увеличиваем количество)
        addToOrder(dish);
        updateOrdersCount();
        
        // Удаляем кнопку "add-to-order"
        btn.remove();
        
        // Создаем панель управления количеством
        const quantityControls = document.createElement('div');
        quantityControls.classList.add('quantity-controls');
        quantityControls.innerHTML = `
          <button class="decrement">-</button>
          <span class="quantity">1</span>
          <button class="increment">+</button>
        `;
        
        // Добавляем панель управления в карточку блюда
        item.appendChild(quantityControls);
        
        const incrementBtn = quantityControls.querySelector('.increment');
        const decrementBtn = quantityControls.querySelector('.decrement');
        const quantitySpan = quantityControls.querySelector('.quantity');
        
        // Обработчик для кнопки "+"
        incrementBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const existing = orders.find(o => o.id === dish.id);
          if (existing) {
            existing.quantity += 1;
            quantitySpan.textContent = existing.quantity;
            updateOrdersCount();
          }
        });
        
        // Обработчик для кнопки "–"
        decrementBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const existing = orders.find(o => o.id === dish.id);
          if (existing) {
            if (existing.quantity > 1) {
              existing.quantity -= 1;
              quantitySpan.textContent = existing.quantity;
            } else {
              // Если количество станет 0, удаляем блюдо из заказов и панель управления,
              // затем возвращаем кнопку "add-to-order"
              orders = orders.filter(o => o.id !== dish.id);
              quantityControls.remove();
              const newBtn = document.createElement('button');
              newBtn.classList.add('add-to-order');
              newBtn.textContent = "+";
              // Повторно привязываем обработчик для новой кнопки
              newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Вызываем эту же функцию для нового элемента
                addAddToOrderListeners();
                newBtn.click(); // запускаем клик, чтобы добавить блюдо заново
              });
              item.appendChild(newBtn);
            }
            updateOrdersCount();
          }
        });
      });
    });
  }
  
  function addOrderModalListeners() {
    const orderModal = document.getElementById('order-modal');
    const orderModalClose = document.getElementById('order-modal-close');
    orderModalClose.addEventListener('click', () => {
      orderModal.style.display = "none";
    });
    window.addEventListener('click', (event) => {
      if (event.target === orderModal) {
        orderModal.style.display = "none";
      }
    });
  }


// Функция для обновления UI карточек блюд в категории
function updateDishCardsUI() {
  const dishItems = document.querySelectorAll('.menu-item');
  dishItems.forEach(item => {
    const dishId = item.dataset.id;
    const existing = orders.find(o => o.id == dishId);
    if (!existing) {
      const qc = item.querySelector('.quantity-controls');
      if (qc) qc.remove();
      if (!item.querySelector('.add-to-order')) {
        const newAddBtn = createAddToOrderButton(item);
        item.appendChild(newAddBtn);
      }
    } else {
      const qc = item.querySelector('.quantity-controls');
      if (qc) {
        const quantitySpan = qc.querySelector('.quantity');
        if (quantitySpan) {
          quantitySpan.textContent = existing.quantity;
        }
      }
    }
  });
}


// В updateOrdersCount() обязательно вызывайте updateDishCardsUI() после обновления массива orders:










function createAddToOrderButton(item) {
  const btn = document.createElement('button');
  btn.classList.add('add-to-order');
  btn.textContent = "+";
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleAddToOrderClick(item, btn);
  });
  return btn;
}

function handleAddToOrderClick(item, addBtn) {
  // Если уже существует панель управления, ничего не делаем
  if (item.querySelector('.quantity-controls')) return;

  // Собираем данные блюда
  const dish = {
    id: item.dataset.id || item.querySelector('h3').textContent,
    name: item.querySelector('h3').textContent,
    price: item.querySelector('p').textContent.replace("Цена: ", "").replace(" сом", ""),
    weight: item.querySelector('p:nth-of-type(2)') 
              ? item.querySelector('p:nth-of-type(2)').textContent.match(/Вес:\s*(\d+)/)?.[1] || ""
              : "",
    quantity: 1,
    description: item.dataset.description || "",
    imageUrl: item.dataset.imageUrl
  };

  // Добавляем блюдо в заказы и обновляем счётчик
  addToOrder(dish);
  updateOrdersCount();
  
  // Удаляем кнопку "+"
  addBtn.remove();

  // Создаем панель управления количеством, как в модальном окне
  const quantityControls = document.createElement('div');
  quantityControls.classList.add('quantity-controls');
  quantityControls.innerHTML = `
    <button class="decrement">-</button>
    <span class="quantity">1</span>
    <button class="increment">+</button>
  `;
  item.appendChild(quantityControls);

  const incrementBtn = quantityControls.querySelector('.increment');
  const decrementBtn = quantityControls.querySelector('.decrement');
  const quantitySpan = quantityControls.querySelector('.quantity');

  // Обработчик для кнопки "+" в панели управления
  incrementBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const existing = orders.find(o => o.id === dish.id);
    if (existing) {
      existing.quantity += 1;
      quantitySpan.textContent = existing.quantity;
      updateOrdersCount();
    }
  });

  // Обработчик для кнопки "-" в панели управления
  decrementBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const existing = orders.find(o => o.id === dish.id);
    if (existing) {
      if (existing.quantity > 1) {
        existing.quantity -= 1;
        quantitySpan.textContent = existing.quantity;
      } else {
        // Если количество становится 0 – удаляем блюдо из заказов и панель управления,
        // затем возвращаем кнопку "+"
        orders = orders.filter(o => o.id !== dish.id);
        quantityControls.remove();
        const newAddBtn = createAddToOrderButton(item);
        item.appendChild(newAddBtn);
      }
      updateOrdersCount();
    }
  });
}

function addSearchFunctionality() {
  const searchInput = document.querySelector('.search-bar input');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    // Если запрос не пустой – скрываем категории, показываем блюда
    if (query !== "") {
      document.getElementById('categories-cards-container').style.display = "none";
      document.getElementById('menu-items').style.display = "block";
    }
    
    // Фильтрация карточек блюд по названию
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      const dishName = item.querySelector('h3') ? item.querySelector('h3').textContent.toLowerCase() : "";
      if (dishName.indexOf(query) > -1) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    });
  });
}



  // Вызываем функции загрузки и обработчиков
  await loadCategories();
  await loadDishes();
  addInfoButtonListeners();
  addDishModalListeners();
  addOrderModalListeners();
  addAddToOrderListeners();
  addSearchFunctionality();
  
});
