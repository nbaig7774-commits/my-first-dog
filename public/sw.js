self.addEventListener("push", function (event) {
    let data = {
        title: "My First Dog",
        body: "You have a new dog-care reminder.",
        url: "/dashboard",
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title || "My First Dog", {
            body: data.body || "You have a new dog-care reminder.",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            data: {
                url: data.url || "/dashboard",
            },
        })
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