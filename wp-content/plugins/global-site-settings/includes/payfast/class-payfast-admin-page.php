<?php
/**
 * PayFast Admin Testing Page
 *
 * Provides quick links to test PayFast payment verification without placing orders
 *
 * @package GlobalSiteSettings
 * @subpackage PayFast
 */

if (!defined('ABSPATH')) {
    exit;
}

class PayFast_Admin_Page {

    /**
     * Register admin page
     */
    public static function init() {
        add_action('admin_menu', array(__CLASS__, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array(__CLASS__, 'enqueue_styles'));
    }

    /**
     * Add admin menu item
     */
    public static function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            'PayFast Testing',
            'PayFast Testing',
            'manage_options',
            'payfast-testing',
            array(__CLASS__, 'render_page')
        );
    }

    /**
     * Enqueue admin styles
     */
    public static function enqueue_styles($hook) {
        if ($hook !== 'woocommerce_page_payfast-testing') {
            return;
        }
        ?>
        <style>
            .payfast-testing-container {
                max-width: 900px;
                margin: 20px 0;
            }
            .payfast-section {
                background: white;
                border: 1px solid #ddd;
                border-radius: 5px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .payfast-section h2 {
                margin-top: 0;
                color: #333;
            }
            .payfast-form {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            .payfast-form-group {
                display: flex;
                flex-direction: column;
            }
            .payfast-form-group label {
                font-weight: 600;
                margin-bottom: 5px;
                color: #333;
            }
            .payfast-form-group input,
            .payfast-form-group select {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            .payfast-form-group input:focus,
            .payfast-form-group select:focus {
                outline: none;
                border-color: #0073aa;
                box-shadow: 0 0 0 2px rgba(0, 115, 170, 0.2);
            }
            .payfast-buttons {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            .payfast-button {
                padding: 10px 20px;
                background: #0073aa;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                text-decoration: none;
                display: inline-block;
            }
            .payfast-button:hover {
                background: #005a87;
            }
            .payfast-button.secondary {
                background: #6c757d;
            }
            .payfast-button.secondary:hover {
                background: #5a6268;
            }
            .payfast-button.success {
                background: #28a745;
            }
            .payfast-button.success:hover {
                background: #218838;
            }
            .payfast-info {
                background: #e8f4f8;
                border-left: 4px solid #0073aa;
                padding: 12px;
                margin: 15px 0;
                border-radius: 4px;
                color: #333;
            }
            .payfast-info code {
                background: #fff;
                padding: 2px 4px;
                border-radius: 2px;
                font-family: monospace;
            }
            .payfast-link-box {
                background: #f9f9f9;
                border: 1px solid #ddd;
                padding: 12px;
                border-radius: 4px;
                margin: 10px 0;
                overflow-wrap: break-word;
                word-break: break-all;
                font-family: monospace;
                font-size: 12px;
            }
            .payfast-recent-orders {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 15px;
            }
            .order-card {
                background: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 15px;
            }
            .order-card h4 {
                margin: 0 0 10px 0;
                color: #0073aa;
            }
            .order-card p {
                margin: 5px 0;
                font-size: 13px;
            }
            .order-card .status {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 12px;
                font-weight: 600;
                margin-top: 8px;
            }
            .order-card .status.processing {
                background: #d1e7f5;
                color: #0073aa;
            }
            .order-card .status.pending {
                background: #fff3cd;
                color: #856404;
            }
            .order-card .status.failed {
                background: #f8d7da;
                color: #721c24;
            }
        </style>
        <?php
    }

    /**
     * Render admin page
     */
    public static function render_page() {
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }

        // Get recent orders
        $orders = wc_get_orders(array(
            'limit' => 10,
            'orderby' => 'date',
            'order' => 'DESC',
            'status' => array('pending', 'processing', 'failed'),
        ));

        ?>
        <div class="wrap">
            <h1>PayFast Payment Testing</h1>
            
            <div class="payfast-testing-container">
                <!-- Quick Test Section -->
                <div class="payfast-section">
                    <h2>🔗 Quick Verification Links</h2>
                    <p>Use these links to test PayFast payment verification with existing orders:</p>
                    
                    <div class="payfast-form">
                        <div class="payfast-form-group">
                            <label for="order_id">Order ID:</label>
                            <input type="number" id="order_id" name="order_id" min="1" placeholder="e.g., 123" />
                        </div>
                        <div></div>
                    </div>

                    <div class="payfast-buttons">
                        <button id="mark-paid-btn" class="payfast-button success" style="pointer-events: none; opacity: 0.5;">
                            💰 Mark as Paid (Test)
                        </button>
                        <a href="#" id="verify-link" class="payfast-button secondary" style="pointer-events: none; opacity: 0.5;">
                            ✓ Verify Payment
                        </a>
                        <a href="#" id="return-link" class="payfast-button" style="pointer-events: none; opacity: 0.5;">
                            🔄 Test Return Flow
                        </a>
                    </div>

                    <div class="payfast-info">
                        <strong>📌 Usage:</strong>
                        <ul style="margin: 8px 0; padding-left: 20px;">
                            <li><code>Mark as Paid</code> - Simulate successful payment (sets order to processing)</li>
                            <li><code>Verify Payment</code> - Check if order payment is marked as processing/complete</li>
                            <li><code>Test Return Flow</code> - Simulate PayFast redirect (will redirect to frontend)</li>
                        </ul>
                    </div>

                    <div id="test-result" style="display: none; margin-top: 15px;"></div>

                    <div id="link-display" style="display: none;">
                        <h3>Generated Links:</h3>
                        <p><strong>Verify Endpoint:</strong></p>
                        <div class="payfast-link-box" id="verify-url"></div>
                        
                        <p><strong>Return Flow (Simulate PayFast Redirect):</strong></p>
                        <div class="payfast-link-box" id="return-url"></div>
                    </div>
                </div>

                <!-- API Endpoints Section -->
                <div class="payfast-section">
                    <h2>⚙️ API Endpoints</h2>
                    <table class="widefat striped">
                        <thead>
                            <tr>
                                <th style="width: 150px;">Method</th>
                                <th style="width: 250px;">Endpoint</th>
                                <th>Purpose</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>GET</code></td>
                                <td><code>/wp-json/belims/v1/payfast/verify-payment/{order_id}</code></td>
                                <td>Check if order payment is complete</td>
                            </tr>
                            <tr>
                                <td><code>GET</code></td>
                                <td><code>/wp-json/belims/v1/payfast/payment-status/{order_id}</code></td>
                                <td>Get detailed payment status</td>
                            </tr>
                            <tr>
                                <td><code>GET</code></td>
                                <td><code>/payfast-return?m_payment_id={order_id}&pf_payment_id={id}</code></td>
                                <td>Test return redirect flow</td>
                            </tr>
                            <tr>
                                <td><code>POST</code></td>
                                <td><code>/wp-json/belims/v1/payfast/itn</code></td>
                                <td>ITN callback (PayFast server calls this)</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="payfast-info" style="margin-top: 15px;">
                        <strong>💡 Tip:</strong> The verify endpoint returns <code>{ "paid": true }</code> when order status is processing/completed.
                    </div>
                </div>

                <!-- Recent Orders Section -->
                <div class="payfast-section">
                    <h2>📦 Recent Pending/Processing Orders</h2>
                    
                    <?php if (!empty($orders)) : ?>
                        <div class="payfast-recent-orders">
                            <?php foreach ($orders as $order) : ?>
                                <div class="order-card">
                                    <h4>Order #<?php echo $order->get_id(); ?></h4>
                                    <p>
                                        <strong>Customer:</strong><br/>
                                        <?php echo esc_html($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()); ?>
                                    </p>
                                    <p>
                                        <strong>Amount:</strong><br/>
                                        <?php echo wp_kses_post($order->get_formatted_order_total()); ?>
                                    </p>
                                    <p>
                                        <strong>Method:</strong><br/>
                                        <?php echo esc_html(ucfirst($order->get_payment_method())); ?>
                                    </p>
                                    <div class="status <?php echo esc_attr($order->get_status()); ?>">
                                        <?php echo esc_html(wc_get_order_status_name($order->get_status())); ?>
                                    </div>
                                    <div style="margin-top: 10px;">
                                        <a href="<?php echo esc_url(admin_url('post.php?post=' . $order->get_id() . '&action=edit')); ?>" 
                                           class="payfast-button secondary" style="font-size: 12px;">
                                            View Order
                                        </a>
                                        <button class="payfast-button secondary" style="font-size: 12px;" onclick="setOrderId(<?php echo $order->get_id(); ?>)">
                                            Test This Order
                                        </button>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php else : ?>
                        <p style="color: #666;">No pending or processing orders found.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <script>
            function setOrderId(orderId) {
                document.getElementById('order_id').value = orderId;
                generateLinks();
                document.getElementById('link-display').style.display = 'block';
                document.getElementById('link-display').scrollIntoView({ behavior: 'smooth' });
            }

            function generateLinks() {
                const orderId = document.getElementById('order_id').value;
                
                if (!orderId || orderId < 1) {
                    document.getElementById('link-display').style.display = 'none';
                    document.getElementById('verify-link').style.pointerEvents = 'none';
                    document.getElementById('verify-link').style.opacity = '0.5';
                    document.getElementById('return-link').style.pointerEvents = 'none';
                    document.getElementById('return-link').style.opacity = '0.5';
                    document.getElementById('mark-paid-btn').style.pointerEvents = 'none';
                    document.getElementById('mark-paid-btn').style.opacity = '0.5';
                    return;
                }

                const baseUrl = '<?php echo home_url(); ?>';
                const verifyUrl = `${baseUrl}/wp-json/belims/v1/payfast/verify-payment/${orderId}`;
                const returnUrl = `${baseUrl}/payfast-return?m_payment_id=${orderId}&pf_payment_id=test-${orderId}`;

                document.getElementById('verify-url').textContent = verifyUrl;
                document.getElementById('return-url').textContent = returnUrl;

                document.getElementById('verify-link').href = verifyUrl;
                document.getElementById('verify-link').style.pointerEvents = 'auto';
                document.getElementById('verify-link').style.opacity = '1';

                document.getElementById('return-link').href = returnUrl;
                document.getElementById('return-link').style.pointerEvents = 'auto';
                document.getElementById('return-link').style.opacity = '1';

                document.getElementById('mark-paid-btn').style.pointerEvents = 'auto';
                document.getElementById('mark-paid-btn').style.opacity = '1';

                document.getElementById('link-display').style.display = 'block';
            }

            // Mark order as paid (test mode)
            document.getElementById('mark-paid-btn').addEventListener('click', function() {
                const orderId = document.getElementById('order_id').value;
                if (!orderId || orderId < 1) {
                    alert('Please enter a valid order ID');
                    return;
                }

                if (!confirm(`Mark order #${orderId} as PAID (test mode)?`)) {
                    return;
                }

                const baseUrl = '<?php echo home_url(); ?>';
                const markPaidUrl = `${baseUrl}/wp-json/belims/v1/payfast/test/mark-paid/${orderId}`;

                const resultDiv = document.getElementById('test-result');
                resultDiv.innerHTML = '<p>Processing...</p>';
                resultDiv.style.display = 'block';

                fetch(markPaidUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': '<?php echo wp_create_nonce('wp_rest'); ?>'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        resultDiv.innerHTML = `
                            <div style="background: #d1e7dd; border: 1px solid #badbcc; padding: 12px; border-radius: 4px; color: #0f5132;">
                                <strong>✓ Success!</strong> Order #${orderId} marked as PAID<br/>
                                <small>Status: ${data.status} | Payment ID: ${data.payment_id}</small><br/><br/>
                                <strong>Next:</strong> Click "Test Return Flow" to see the redirect to frontend
                            </div>
                        `;
                    } else {
                        resultDiv.innerHTML = `
                            <div style="background: #f8d7da; border: 1px solid #f5c2c7; padding: 12px; border-radius: 4px; color: #842029;">
                                <strong>✗ Error:</strong> ${data.message || 'Failed to mark order as paid'}
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    resultDiv.innerHTML = `
                        <div style="background: #f8d7da; border: 1px solid #f5c2c7; padding: 12px; border-radius: 4px; color: #842029;">
                            <strong>✗ Error:</strong> ${error.message}
                        </div>
                    `;
                });
            });

            // Generate links on input change
            document.getElementById('order_id').addEventListener('input', generateLinks);
        </script>
        <?php
    }
}

// Initialize
PayFast_Admin_Page::init();
