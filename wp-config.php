<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the web site, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * Localized language
 * * ABSPATH
 *
 * @link https://wordpress.org/support/article/editing-wp-config-php/
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'local' );

/** Database username */
define( 'DB_USER', 'root' );

/** Database password */
define( 'DB_PASSWORD', 'root' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',          '7$Gu]mIJyOPG.Oi&cmx@>F(X*D>P g#}dll}*_/ob9#s]:bYTRfh(ETI7y>VTW:R' );
define( 'SECURE_AUTH_KEY',   '<Sg~LpQ~-OfV;S8g:gK7@Y.X6V+,Ldr9)8P$zs>C8~PAefqU83aFD~da#a+DiO,A' );
define( 'LOGGED_IN_KEY',     'd=bIS>y5wB4dW{F= :b2a(WLu{A%BKQG?I376QqwY:D!(e0+6e={gLuA.6UrF+{?' );
define( 'NONCE_KEY',         'c`LiudRnQ]n8Yre/tNi{*-QU}A(>2uo`^*E:zHI;viXQ3U3PHv#T|~T83pDs!Eqq' );
define( 'AUTH_SALT',         '^Up%W{N5|]iGXvSH}x@NDsG(JVla#-7PQ;?=L`X~}<MZ{q:m9wS(HxtRBMrt&?{<' );
define( 'SECURE_AUTH_SALT',  'tv5nIhk,dTotT}CsrX)jq0M8y7bWdp!`: %kR[,Z3IHodjYTY<Kbn=LbH[5l;P:|' );
define( 'LOGGED_IN_SALT',    'CSaLcQ2Jal2|yB%3F:6nwTe3oc`~j)J_.-CjNafh5$@]&umn?5t35RxB3jBv{G;)' );
define( 'NONCE_SALT',        ')@wC4gB>16w&8Wa/m<x;sTfA=cj/Z3~Ts4QpK?0&]hDgO 53Qe#6rX_]t@^m/n2%' );
define( 'WP_CACHE_KEY_SALT', 'k&vdcH0@ZvCbk5q+31[O;bO>^1-k|;1R^|n_|7!8cv&LWZ35_]Xn,t >A3Bz]aY,' );


/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';


/* Add any custom values between this line and the "stop editing" line. */



/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/support/article/debugging-in-wordpress/
 */
if ( ! defined( 'WP_DEBUG' ) ) {
	define( 'WP_DEBUG', false );
}

define( 'WP_ENVIRONMENT_TYPE', 'local' );
/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
