<?php
/**
 * User Management Admin Page
 * Provides an interface for testing user registration and viewing registered users
 * 
 * @package GlobalSiteSettings
 */

if (!defined('ABSPATH')) exit;

class User_Management_Admin {
    
    /**
     * Initialize admin page
     */
    public static function init() {
        add_action('admin_menu', [__CLASS__, 'add_admin_menu']);
    }

    /**
     * Add admin menu page
     */
    public static function add_admin_menu() {
        add_menu_page(
            'User Management',
            'User Testing',
            'manage_options',
            'belims-user-testing',
            [__CLASS__, 'render_admin_page'],
            'dashicons-groups',
            30
        );
    }

    /**
     * Render admin page
     */
    public static function render_admin_page() {
        // Get all customers
        $customers = get_users([
            'role__in' => ['customer'],
            'orderby' => 'registered',
            'order' => 'DESC',
        ]);

        $api_base = rest_url('belims/v1');
        $nonce = wp_create_nonce('wp_rest');
        ?>
        <div class="wrap">
            <h1>🧪 User Account Testing</h1>
            <p>Test user registration and manage test accounts for the headless frontend.</p>

            <div class="notice notice-info inline">
                <p><strong>API Endpoint:</strong> <code><?php echo esc_html($api_base); ?>/users/register</code></p>
                <p><strong>Frontend Service:</strong> <code>authService.ts</code></p>
            </p>
            </div>

            <hr>

            <h2>✨ Quick Test Registration</h2>
            <p>Quickly create a test user account to verify the registration system is working.</p>

            <form id="quick-register-form" style="max-width: 600px; background: #f9f9f9; padding: 20px; border-radius: 8px;">
                <table class="form-table">
                    <tr>
                        <th><label for="test_email">Email:</label></th>
                        <td>
                            <input type="email" id="test_email" class="regular-text" 
                                   value="test<?php echo time(); ?>@belims.co.za" required>
                            <p class="description">Auto-generated test email (you can change it)</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="test_password">Password:</label></th>
                        <td>
                            <input type="text" id="test_password" class="regular-text" 
                                   value="Test1234!" required>
                            <p class="description">Minimum 8 characters</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="test_first_name">First Name:</label></th>
                        <td>
                            <input type="text" id="test_first_name" class="regular-text" 
                                   value="Test" required>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="test_last_name">Last Name:</label></th>
                        <td>
                            <input type="text" id="test_last_name" class="regular-text" 
                                   value="User" required>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="test_phone">Phone:</label></th>
                        <td>
                            <input type="text" id="test_phone" class="regular-text" 
                                   value="+27123456789">
                        </td>
                    </tr>
                </table>

                <p class="submit">
                    <button type="submit" class="button button-primary button-large">
                        👤 Create Test User
                    </button>
                </p>

                <div id="register-status"></div>
            </form>

            <hr>

            <h2>👥 Registered Customers (<?php echo count($customers); ?>)</h2>

            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Username</th>
                        <th>Phone</th>
                        <th>Registered</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($customers)): ?>
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px;">
                                <p style="font-size: 16px; color: #666;">No customers registered yet.</p>
                                <p>Create your first test user above! 👆</p>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($customers as $customer): ?>
                            <?php
                            $first_name = get_user_meta($customer->ID, 'first_name', true);
                            $last_name = get_user_meta($customer->ID, 'last_name', true);
                            $phone = get_user_meta($customer->ID, 'billing_phone', true);
                            ?>
                            <tr>
                                <td><?php echo esc_html($customer->ID); ?></td>
                                <td><?php echo esc_html($first_name . ' ' . $last_name); ?></td>
                                <td><?php echo esc_html($customer->user_email); ?></td>
                                <td><?php echo esc_html($customer->user_login); ?></td>
                                <td><?php echo esc_html($phone); ?></td>
                                <td><?php echo esc_html(date('Y-m-d H:i', strtotime($customer->user_registered))); ?></td>
                                <td>
                                    <a href="<?php echo admin_url('user-edit.php?user_id=' . $customer->ID); ?>" 
                                       class="button button-small">Edit</a>
                                    <?php if (strpos($customer->user_email, 'test') !== false): ?>
                                        <button class="button button-small delete-test-user" 
                                                data-user-id="<?php echo esc_attr($customer->ID); ?>"
                                                data-user-email="<?php echo esc_attr($customer->user_email); ?>">
                                            Delete
                                        </button>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>

            <style>
                #register-status {
                    margin-top: 20px;
                }
                #register-status .notice {
                    padding: 10px 15px;
                    margin: 10px 0;
                }
            </style>

            <script>
                jQuery(document).ready(function($) {
                    // Quick registration form
                    $('#quick-register-form').on('submit', function(e) {
                        e.preventDefault();

                        var data = {
                            email: $('#test_email').val(),
                            password: $('#test_password').val(),
                            first_name: $('#test_first_name').val(),
                            last_name: $('#test_last_name').val(),
                            phone: $('#test_phone').val()
                        };

                        var $status = $('#register-status');
                        $status.html('<p>⏳ Creating user account...</p>');

                        $.ajax({
                            url: '<?php echo esc_js(rest_url('belims/v1/users/register')); ?>',
                            method: 'POST',
                            data: JSON.stringify(data),
                            contentType: 'application/json',
                            beforeSend: function(xhr) {
                                xhr.setRequestHeader('X-WP-Nonce', '<?php echo $nonce; ?>');
                            },
                            success: function(response) {
                                var html = '<div class="notice notice-success inline"><p>';
                                html += '<strong>✅ User Created Successfully!</strong><br>';
                                html += 'User ID: ' + response.user.id + '<br>';
                                html += 'Email: ' + response.user.email + '<br>';
                                html += 'Username: ' + response.user.username;
                                html += '</p></div>';
                                
                                $status.html(html);
                                
                                // Reload page after 2 seconds to show in table
                                setTimeout(function() {
                                    location.reload();
                                }, 2000);
                            },
                            error: function(xhr) {
                                var errorMsg = xhr.responseJSON?.message || 'Unknown error';
                                var html = '<div class="notice notice-error inline"><p>';
                                html += '<strong>❌ Registration Failed</strong><br>';
                                html += errorMsg;
                                html += '</p></div>';
                                $status.html(html);
                            }
                        });
                    });

                    // Delete test users
                    $('.delete-test-user').on('click', function() {
                        var userId = $(this).data('user-id');
                        var userEmail = $(this).data('user-email');

                        if (!confirm('Delete test user: ' + userEmail + '?')) {
                            return;
                        }

                        $.post(ajaxurl, {
                            action: 'delete_test_user',
                            user_id: userId,
                            _ajax_nonce: '<?php echo wp_create_nonce('delete_test_user'); ?>'
                        }, function(response) {
                            if (response.success) {
                                location.reload();
                            } else {
                                alert('Failed to delete user');
                            }
                        });
                    });
                });
            </script>
        </div>
        <?php
    }
}

// Initialize
User_Management_Admin::init();

// AJAX handler for deleting test users
add_action('wp_ajax_delete_test_user', function() {
    check_ajax_referer('delete_test_user');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Unauthorized');
    }

    $user_id = intval($_POST['user_id']);
    
    require_once(ABSPATH . 'wp-admin/includes/user.php');
    $result = wp_delete_user($user_id);

    if ($result) {
        wp_send_json_success();
    } else {
        wp_send_json_error('Failed to delete user');
    }
});
