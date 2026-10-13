const nodemailer = require("nodemailer");

/**
 * Configure email transporter
 * Supports Gmail / custom SMTP when EMAIL_USER and EMAIL_PASS are set in .env
 * Falls back to Ethereal / simulated test email logger for development
 */
function createTransporter() {
    try {
        require("dotenv").config({ override: true });
    } catch (e) {
        // ignore in case of dotenv error
    }

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (user && pass && user.trim() !== "" && pass.trim() !== "") {
        const port = parseInt(process.env.EMAIL_PORT, 10) || 465;
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST || "smtp.gmail.com",
            port: port,
            secure: port === 465, // true for port 465 (direct SSL), false for 587 (STARTTLS)
            auth: {
                user: user.trim(),
                pass: pass.trim().replace(/\s+/g, "")
            },
            connectionTimeout: 10000, // 10s connection timeout fail-safe
            greetingTimeout: 10000,   // 10s greeting timeout fail-safe
            socketTimeout: 15000      // 15s socket activity timeout fail-safe
        });
    }

    // Fallback: development test transporter
    return null;
}

/**
 * Send Accommodation Booking Confirmation Email
 */
async function sendBookingConfirmationEmail(booking, listing) {
    try {
        const recipientEmail = booking.guestEmail || "traveler@example.com";
        const guestName = booking.guestName || "Traveler";
        const listingTitle = (listing && listing.title) ? listing.title : "Vacation Stay";
        const listingLocation = listing ? `${listing.location || ''}, ${listing.country || ''}` : "Stay Location";
        const checkInFormatted = new Date(booking.checkIn).toLocaleDateString("en-IN", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        });
        const checkOutFormatted = new Date(booking.checkOut).toLocaleDateString("en-IN", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        });
        const baseUrl = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:8080";

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 20px; color: #222222; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #eaeaea; }
                .header { background: #FF385C; color: #ffffff; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 15px; }
                .body { padding: 30px; }
                .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 14px; margin-bottom: 20px; }
                .listing-box { display: flex; align-items: center; background: #fbfbfb; border: 1px solid #eeeeee; border-radius: 12px; padding: 15px; margin-bottom: 25px; }
                .details-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                .details-table td { padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
                .details-table td.label { color: #717171; }
                .details-table td.value { text-align: right; font-weight: 600; color: #222222; }
                .price-box { background: #fafafa; border: 1px solid #eeeeee; border-radius: 12px; padding: 18px; margin-bottom: 25px; }
                .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #222222; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0; }
                .btn { display: block; text-align: center; background: #FF385C; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 30px; font-weight: 700; font-size: 15px; margin: 25px 0 10px; }
                .footer { padding: 20px 30px; background: #fbfbfb; border-top: 1px solid #eeeeee; text-align: center; font-size: 12px; color: #888888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Wanderlust Reservation Confirmed!</h1>
                    <p>Pack your bags, ${guestName}! Your stay is booked.</p>
                </div>
                <div class="body">
                    <div style="text-align: center;">
                        <span class="badge">Confirmation Code: ${booking.bookingCode}</span>
                    </div>

                    <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 18px;">${listingTitle}</h3>
                    <p style="color: #717171; margin-top: 0; font-size: 14px; margin-bottom: 20px;">📍 ${listingLocation}</p>

                    <table class="details-table">
                        <tr>
                            <td class="label">Primary Guest</td>
                            <td class="value">${guestName}</td>
                        </tr>
                        <tr>
                            <td class="label">Check-in</td>
                            <td class="value">${checkInFormatted}</td>
                        </tr>
                        <tr>
                            <td class="label">Check-out</td>
                            <td class="value">${checkOutFormatted}</td>
                        </tr>
                        <tr>
                            <td class="label">Duration</td>
                            <td class="value">${booking.totalNights} ${booking.totalNights === 1 ? 'Night' : 'Nights'}</td>
                        </tr>
                        <tr>
                            <td class="label">Guests</td>
                            <td class="value">${booking.guests} Guests</td>
                        </tr>
                        <tr>
                            <td class="label">Payment Method</td>
                            <td class="value">${booking.paymentMethod}</td>
                        </tr>
                    </table>

                    <div class="price-box">
                        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #555; margin-bottom: 6px;">
                            <span>₹${Number(booking.nightlyPrice).toLocaleString('en-IN')} × ${booking.totalNights} nights</span>
                            <span>₹${Number(booking.nightlyPrice * booking.totalNights).toLocaleString('en-IN')}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #555; margin-bottom: 6px;">
                            <span>Cleaning Fee</span>
                            <span>₹${Number(booking.cleaningFee).toLocaleString('en-IN')}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #555; margin-bottom: 6px;">
                            <span>Wanderlust Service Fee</span>
                            <span>₹${Number(booking.serviceFee).toLocaleString('en-IN')}</span>
                        </div>
                        <div class="total-row">
                            <span>Total Amount</span>
                            <span>₹${Number(booking.totalPrice).toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <a href="${baseUrl}/bookings/${booking._id}/confirmation" class="btn">View Reservation Voucher</a>
                </div>
                <div class="footer">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} Wanderlust, Inc. Need help? Visit our Help Center.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        let transporter = createTransporter();

        if (transporter) {
            try {
                const info = await transporter.sendMail({
                    from: `"Wanderlust Reservations" <${process.env.EMAIL_USER}>`,
                    to: recipientEmail,
                    subject: `Booking Confirmed: ${listingTitle} (${booking.bookingCode})`,
                    html: htmlContent
                });
                console.log(`[MAILER LIVE] Confirmation email sent successfully to ${recipientEmail}: ${info.messageId}`);
                return { sent: true, isLive: true, recipient: recipientEmail };
            } catch (liveErr) {
                console.error("[MAILER LIVE ERROR]:", liveErr.message);
                if (liveErr.message.includes("535") || liveErr.message.includes("Username and Password not accepted") || liveErr.message.includes("Application-specific password")) {
                    return {
                        error: "Gmail login rejected: Please generate a 16-character Google App Password at https://myaccount.google.com/apppasswords (do not use your regular account password)."
                    };
                }
                return { error: liveErr.message };
            }
        } else {
            // Instant Ethereal test inbox fallback
            const testAccount = await nodemailer.createTestAccount();
            const testTransporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });

            const info = await testTransporter.sendMail({
                from: '"Wanderlust Reservations" <reservations@wanderlust.com>',
                to: recipientEmail,
                subject: `Booking Confirmed: ${listingTitle} (${booking.bookingCode})`,
                html: htmlContent
            });

            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log("==========================================================");
            console.log(`[MAILER ETHEREAL] Confirmation email sent for: ${recipientEmail}`);
            console.log(`Subject: Booking Confirmed: ${listingTitle} (${booking.bookingCode})`);
            console.log(`Preview Email in Browser: ${previewUrl}`);
            console.log("==========================================================");

            return { sent: true, previewUrl, recipient: recipientEmail, isPreview: true };
        }
    } catch (err) {
        console.error("[MAILER ERROR] Failed to send booking confirmation email:", err.message);
        return { error: err.message };
    }
}

/**
 * Send Cab Booking Confirmation Email
 */
async function sendCabConfirmationEmail(cabBooking) {
    try {
        const recipientEmail = (cabBooking.user && cabBooking.user.email) || "passenger@example.com";
        const dateFormatted = new Date(cabBooking.travelDate).toLocaleDateString("en-IN", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        });

        const transporter = createTransporter();

        if (transporter) {
            await transporter.sendMail({
                from: `"Wanderlust Transfers" <${process.env.EMAIL_USER}>`,
                to: recipientEmail,
                subject: `Cab Booking Confirmed: ${cabBooking.bookingCode}`,
                html: `
                    <h2>Your Wanderlust Cab is Booked!</h2>
                    <p><strong>Booking Code:</strong> ${cabBooking.bookingCode}</p>
                    <p><strong>Pickup Location:</strong> ${cabBooking.pickupLocation}</p>
                    <p><strong>Dropoff Destination:</strong> ${cabBooking.dropoffLocation}</p>
                    <p><strong>Date & Time:</strong> ${dateFormatted} at ${cabBooking.pickupTime}</p>
                    <p><strong>Vehicle:</strong> ${cabBooking.cabType}</p>
                    <p><strong>Estimated Fare:</strong> ₹${Number(cabBooking.estimatedFare).toLocaleString('en-IN')}</p>
                `
            });
            console.log(`[MAILER] Cab confirmation email sent to ${recipientEmail}`);
        } else {
            console.log(`[MAILER DEMO] Cab Confirmation for ${recipientEmail}: Pickup: ${cabBooking.pickupLocation} -> Fare: ₹${cabBooking.estimatedFare}`);
        }
    } catch (err) {
        console.error("[MAILER ERROR] Failed to send cab confirmation email:", err.message);
    }
}

module.exports = {
    sendBookingConfirmationEmail,
    sendCabConfirmationEmail
};
