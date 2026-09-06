self.addEventListener("push", function (event) {
    let data = {
        title: "🐶 My First Dog",
        body: "You have a new dog-care reminder.",
        url: "/dashboard",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
    };

    if (event.data) {
        try {
            const incoming = event.data.json();

            data = {
                ...data,
                ...incoming,
            };
        } catch {
            data.body = event.data.text();
        }
    }

    const title = data.title || "🐶 My First Dog";

    const options = {
        body: data.body || "You have a new dog-care reminder.",
        icon: data.icon || "/icon-192.png",
        badge: data.badge || "/icon-192.png",

        // Makes the notification stay visible until the user interacts with it.
        requireInteraction: true,

        // Prevents duplicate notifications from stacking unnecessarily.
        tag: data.tag || "my-first-dog-reminder",

        // Data used when the notification is clicked.
        data: {
            url: data.url || "/dashboard",
        },
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const url = event.notification.data?.url || "/dashboard";

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true,
        }).then(function (clientList) {
            for (const client of clientList) {
                if ("focus" in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});