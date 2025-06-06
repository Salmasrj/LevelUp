/**
 * LevelUp - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.classList.toggle('menu-open');
    });
  }
  
  // User dropdown toggle
  const userMenuButton = document.querySelector('.user-menu-button');
  if (userMenuButton) {
    userMenuButton.addEventListener('click', function(e) {
      e.stopPropagation();
      document.querySelector('.user-dropdown').classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      const userMenu = document.querySelector('.user-menu');
      if (userMenu && !userMenu.contains(e.target)) {
        document.querySelector('.user-dropdown').classList.remove('active');
      }
    });
  }
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      
      if (targetId === '#') {
        return; // Skip if it's just "#"
      }
      
      e.preventDefault();
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });

  // Contact form handling
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const contactResponse = document.getElementById('contact-response');
      
      // In a real implementation, you would send this data to your server
      // For now, just show a success message
      contactResponse.textContent = 'Merci pour votre message ! Nous vous répondrons très rapidement.';
      contactResponse.className = 'form-message success';
      
      // Reset form
      contactForm.reset();
      
      // Hide message after 5 seconds
      setTimeout(() => {
        contactResponse.textContent = '';
        contactResponse.className = 'form-message';
      }, 5000);
    });
  }

  // Notification function - made available to all code in this scope
  function showNotification(message, type = 'info') {
    // Check if notification container exists, if not create it
    let notificationContainer = document.querySelector('.notification-container');
    
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.className = 'notification-container';
      document.body.appendChild(notificationContainer);
      
      // Add styles to the notification container
      notificationContainer.style.position = 'fixed';
      notificationContainer.style.top = '20px';
      notificationContainer.style.right = '20px';
      notificationContainer.style.zIndex = '1000';
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.backgroundColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(20px)';
    notification.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(20px)';
      
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
  
  // Newsletter form submission
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const emailInput = this.querySelector('input[type="email"]');
      const email = emailInput.value;
      
      if (!email) {
        alert('Veuillez saisir une adresse email valide.');
        return;
      }
      
      // Send to server (can be implemented later)
      console.log('Newsletter subscription:', email);
      
      // Show success message
      emailInput.value = '';
      alert('Merci pour votre inscription à notre newsletter !');
    });
  }
  
  // Add animation on scroll
  const animateElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animateElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
        }
      });
    }, { threshold: 0.1 });
    
    animateElements.forEach(element => {
      observer.observe(element);
    });
  }

  // Notification banner close button
  const closeNotificationBtn = document.querySelector('.close-notification');
  if (closeNotificationBtn) {
    closeNotificationBtn.addEventListener('click', function() {
      const banner = this.closest('.notification-banner');
      banner.style.height = banner.offsetHeight + 'px';
      setTimeout(() => {
        banner.style.height = '0';
        banner.style.opacity = '0';
      }, 10);
      setTimeout(() => {
        banner.remove();
      }, 300);
    });
  }

  // Function to handle add-to-cart notifications from URL parameters when page loads
  function handleUrlNotifications() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    
    if (message) {
      // Show notification based on the message type
      if (message === 'success') {
        showNotification('Produit ajouté au panier avec succès', 'success');
      } else if (message === 'already') {
        showNotification('Ce produit est déjà dans votre panier', 'info');
      } else if (message === 'error') {
        showNotification('Une erreur est survenue', 'error');
      }
      
      // Clear the URL parameters without reloading the page
      const url = new URL(window.location);
      url.searchParams.delete('message');
      url.searchParams.delete('courseId');
      window.history.replaceState({}, '', url);
    }
  }

  // Helper function to update cart count indicator
  function updateCartCount(count) {
    // Find the cart icon in the header
    const cartIcon = document.querySelector('.cart-icon');
    
    if (!cartIcon) return;
    
    // Find existing badge or create a new one
    let cartBadge = cartIcon.querySelector('.cart-badge');
    
    if (count <= 0) {
      // Remove the badge if count is zero
      if (cartBadge) {
        cartBadge.remove();
      }
      return;
    }
    
    // If badge doesn't exist, create it
    if (!cartBadge) {
      cartBadge = document.createElement('span');
      cartBadge.className = 'cart-badge';
      cartIcon.appendChild(cartBadge);
    }
    
    // Update the badge text and make sure it's visible
    cartBadge.textContent = count;
    cartBadge.style.display = 'flex';
  }

  // Process URL notifications
  handleUrlNotifications();

  // Add-to-cart form handling
  document.querySelectorAll('form[action^="/cart/add/"]').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formAction = this.getAttribute('action');
      
      // More robust CSRF token retrieval
      let csrfToken;
      const metaToken = document.querySelector('meta[name="csrf-token"]');
      const inputToken = document.querySelector('input[name="_csrf"]');
      
      if (metaToken) {
        csrfToken = metaToken.getAttribute('content');
      } else if (inputToken) {
        csrfToken = inputToken.value;
      } else {
        console.error('CSRF token not found!');
        showNotification('Erreur de sécurité. Veuillez rafraîchir la page.', 'error');
        return;
      }
      
      console.log('Adding to cart:', formAction); // Debug info
      
      fetch(formAction, {
        method: 'POST',
        headers: {
          'CSRF-Token': csrfToken,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `_csrf=${encodeURIComponent(csrfToken)}`
      })
      .then(response => {
        console.log('Response status:', response.status); // Debug info
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`Status ${response.status}: ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('Cart response:', data); // Debug info
        
        if (data.success) {
          // Update cart counter using the updateCartCount function
          updateCartCount(data.cartCount);
          
          // Show success notification
          showNotification(data.message, 'success');
        } else {
          showNotification(data.message || 'Une erreur est survenue', 'info');
        }
      })
      .catch(error => {
        console.error('Error adding to cart:', error);
        showNotification('Une erreur est survenue lors de l\'ajout au panier', 'error');
      });
    });
  });
});