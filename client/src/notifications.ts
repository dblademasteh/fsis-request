export interface AppNotification {
  id: string;
  type: "new_request" | "approved" | "denied" | "deleted" | "update";
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
  const purposeMessages: Record<string, string> = {
    "Transfer of Unit Assignment": `Transfer approved for ${name}.`,
    "New FSIS Account": `New e Request account approved for ${name}. Password reset email sent.`,
    "Update Rank": `${name}'s rank update approved.`,
    "Update Name": `${name}'s name update approved.`,
    "Update Email": `${name}'s email update approved.`,
  };
  
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
        message: purpose ? (purposeMessages[purpose] || `Your ${purpose.toLowerCase()} request has been approved.`) : `Your request has been approved.`,
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
    case "deleted":
      return {
        id: `dl-${Date.now()}`,
        type,
        title: "Request Deleted",
        message: `A request has been deleted.`,
        timestamp: Date.now(),
        read: false,
      };
    case "update":
      return {
        id: `up-${Date.now()}`,
        type,
        title: "Request Updated",
        message: `Your ${purpose ? purpose.toLowerCase() : "request"} has been updated.`,
        timestamp: Date.now(),
        read: false,
      };
  }
}
