/**
 * LevelUp - Cart functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Remove from cart functionality
    const removeFromCartForms = document.querySelectorAll('form[action^="/cart/remove/"]');
    
    removeFromCartForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formAction = this.getAttribute('action');
            const courseId = formAction.split('/').pop();
            const cartItem = this.closest('.cart-item');
            const courseTitle = cartItem.querySelector('h3')?.textContent || 'Formation';
            
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            fetch(formAction, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Remove item from DOM
                    if (cartItem) {
                        cartItem.remove();
                    }
                    
                    // Update cart count and total
                    updateCartCount(data.cartCount);
                    updateCartTotal(data.cartTotal);
                    
                    // If cart is empty, show empty cart message without reloading
                    if (data.cartCount === 0) {
                        showEmptyCartMessage();
                    }
                    
                    // Show alert
                    alert('Formation retirée du panier');
                } else {
                    alert(data.message || 'Erreur lors de la suppression');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Une erreur est survenue lors de la suppression');
            });
        });
    });
    
    // Clear cart functionality
    const clearCartForm = document.querySelector('form[action="/cart/clear"]');

    if (clearCartForm) {
    clearCartForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!confirm('Êtes-vous sûr de vouloir vider votre panier ?')) {
        return;
        }
        
        // Get CSRF token
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        fetch('/cart/clear', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': csrfToken // Add the CSRF token here
        }
        })
        .then(response => response.json())
        .then(data => {
        if (data.success) {
            // Show empty cart message without reloading
            showEmptyCartMessage();
            updateCartCount(0);
        } else {
            alert(data.message || 'Erreur lors de la suppression du panier');
        }
        })
        .catch(error => {
        console.error('Error:', error);
        alert('Une erreur est survenue');
        });
    });
    }
    
    // Helper functions
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
    
    function updateCartTotal(total) {
        const totalElement = document.querySelector('.summary-item span:last-child');
        if (totalElement && total !== undefined) {
            totalElement.textContent = `${total.toFixed(2)}€`;
        }
    }
    
    // New function to show empty cart message
    function showEmptyCartMessage() {
        const cartContainer = document.querySelector('.cart-container');
        if (!cartContainer) return;
        
        // Create empty cart message HTML
        const emptyCartHTML = `
            <div class="empty-cart">
                <img src="/images/empty-cart.svg" alt="Panier vide">
                <h2>Votre panier est vide</h2>
                <p>Découvrez nos formations et commencez votre apprentissage dès aujourd'hui !</p>
                <a href="/#formations" class="btn btn-primary">Voir les formations</a>
            </div>
        `;
        
        // Replace cart container with empty cart message
        const cartSection = document.querySelector('.cart-section .container');
        if (cartSection) {
            cartSection.innerHTML = '<h1>Votre panier</h1>' + emptyCartHTML;
        }
    }
});