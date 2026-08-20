export interface AppNotification {
  id: string;
  type: "new_request" | "approved" | "denied";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export function requestNotificationPermission(): void {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function showDeviceNotification(title: string, body: string, icon?: string): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: icon || "/logo.png",
      badge: "/logo.png",
      tag: "fsis-notification",
    });
  } catch {}
}

export function createNotification(
  type: AppNotification["type"],
  firstName: string,
  lastName: string,
  purpose?: string
): AppNotification {
  const name = `${firstName} ${lastName}`;
  switch (type) {
    case "new_request":
      return {
        id: `nr-${Date.now()}`,
        type,
        title: "New Request Received",
        message: `${name} submitted a${purpose ? ` ${purpose.toLowerCase()}` : ""} request.`,
        timestamp: Date.now(),
        read: false,
      };
    case "approved":
      return {
        id: `ap-${Date.now()}`,
        type,
        title: "Request Approved",
        message: `Your request has been approved.`,
        timestamp: Date.now(),
        read: false,
      };
    case "denied":
      return {
        id: `dn-${Date.now()}`,
        type,
        title: "Request Denied",
        message: `Your request has been denied.`,
        timestamp: Date.now(),
        read: false,
      };
  }
}
