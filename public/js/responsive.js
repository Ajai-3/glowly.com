// Toggle Shop by Category
document.getElementById('shopByCategory').addEventListener('click', function() {
    const categoryList = document.getElementById('category-list');
    const icon = this.querySelector('i');
    
    categoryList.style.display = categoryList.style.display === 'none' ? 'block' : 'none';
    
    if (categoryList.style.display === 'block') {
        icon.classList.remove('fa-plus');
        icon.classList.add('fa-minus');
        this.style.backgroundColor = '#fc2779';
    } else {
        icon.classList.remove('fa-minus');
        icon.classList.add('fa-plus');
        this.style.backgroundColor = '';
    }
});

// Toggle Shop by Brand
document.getElementById('shopByBrand').addEventListener('click', function() {
    const brandList = document.getElementById('brand-list');
    const icon = this.querySelector('i');
    
    brandList.style.display = brandList.style.display === 'none' ? 'block' : 'none';
    
    if (brandList.style.display === 'block') {
        icon.classList.remove('fa-plus');
        icon.classList.add('fa-minus');
        this.style.backgroundColor = '#fc2779';
    } else {
        icon.classList.remove('fa-minus');
        icon.classList.add('fa-plus');
        this.style.backgroundColor = '';
    }
});

// Toggle Subcategories for each category (with separate icon inside .category-btn)
document.querySelectorAll('.category-div-sid-bar').forEach((categoryDiv) => {
    categoryDiv.querySelectorAll('.category-btn').forEach((categoryButton) => {
        categoryButton.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-category-id');
            const subcategoryList = document.getElementById(`subcategory-${categoryId}`);
            const icon = categoryDiv.querySelectorAll('i')[0];  // Get the icon next to category name

            // Toggle subcategory list visibility and icon
            if (subcategoryList.style.display === 'none' || subcategoryList.style.display === '') {
                subcategoryList.style.display = 'block';
                icon.classList.remove('fa-plus');
                icon.classList.add('fa-minus');
            } else {
                subcategoryList.style.display = 'none';
                icon.classList.remove('fa-minus');
                icon.classList.add('fa-plus');
            }
        });
    });
});


    const sidebar = document.getElementById('sidebarMenuUserSide');
    const closeMenuButton = document.getElementById('closeMenuButton');
    const overlay = document.getElementById('overlay');
    
    const hamburgerMenu = document.querySelector('.hamburger-menu-user-side');
    hamburgerMenu.addEventListener('click', function() {
        sidebar.style.display = 'block';
        overlay.style.display = 'block';
    });
    
    closeMenuButton.addEventListener('click', function() {
        sidebar.style.display = 'none';
        overlay.style.display = 'none';
    });
    
    document.body.addEventListener('click', function(event) {
        if (sidebar.style.display === 'block' && !sidebar.contains(event.target) && !hamburgerMenu.contains(event.target) && !overlay.contains(event.target)) {
            sidebar.style.display = 'none';
            overlay.style.display = 'none';
        }
    });
    
    sidebar.addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    overlay.addEventListener('click', function() {
        sidebar.style.display = 'none';
        overlay.style.display = 'none';
    });
