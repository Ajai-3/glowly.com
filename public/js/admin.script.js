document.addEventListener('DOMContentLoaded', function () {
  const currentPath = window.location.pathname; 
  const links = document.querySelectorAll('.sidebar a');

  links.forEach(link => link.classList.remove('active'));

  links.forEach(link => {
    const path = link.getAttribute('href')

    const regexPatterns = {
      '/admin/products': [
        /^\/admin\/products$/,
        /^\/admin\/add-products$/,
        /^\/admin\/edit-product\/[a-f0-9]{24}$/
      ],
      '/admin/brands': [
        /^\/admin\/brands$/,
        /^\/admin\/add-new-brand$/,
        /^\/admin\/edit-brand\/[a-f0-9]{24}$/
      ],
      '/admin/category': [
        /^\/admin\/category$/,
        /^\/admin\/add-category$/,
        /^\/admin\/add-offer\/[a-f0-9]{24}$/
      ]
    };

    if (currentPath === path) {
      link.classList.add('active');
      return;
    }

    for (const [basePath, patterns] of Object.entries(regexPatterns)) {
      if (patterns.some(regex => regex.test(currentPath)) && path === basePath) {
        link.classList.add('active');
        return;
      }
    }
  });
});
