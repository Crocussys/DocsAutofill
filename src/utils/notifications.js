const NotificationType = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

function log(type, message) {
    if (type === NotificationType.DEBUG && !DEBUG_ENABLED) {
        return;
    }
    
    const prefix = `[DocsAutofill] [${type.toUpperCase()}]`;

    switch (type) {
        case NotificationType.ERROR:
            console.error(prefix, message);
            break;

        case NotificationType.WARN:
            console.warn(prefix, message);
            break;

        case NotificationType.DEBUG:
            console.debug(prefix, message);
            break;

        default:
            console.info(prefix, message);
            break;
    }
}

const NotificationService = (() => {
  const CONTAINER_ID = 'docsautofill-notifications';
  const DEFAULT_DURATION = 3500;

  function getContainer() {
    let container = document.getElementById(CONTAINER_ID);

    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;

      Object.assign(container.style, {
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: '2147483647',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '10px',
        maxWidth: '360px',
        pointerEvents: 'none'
      });

      document.body.appendChild(container);
    }

    return container;
  }

  function getColors(type) {
    switch (type) {
      case NotificationType.ERROR:
        return { border: '#e53935', background: '#fff5f5' };
      case NotificationType.WARN:
        return { border: '#fbc02d', background: '#fffde7' };
      case NotificationType.INFO:
      default:
        return { border: '#43a047', background: '#f1fff4' };
    }
  }

  function show(message, type = NotificationType.INFO, durationMs = DEFAULT_DURATION) {
    log(type, message);

    const container = getContainer();
    const colors = getColors(type);

    const notification = document.createElement('div');
    notification.textContent = message;

    Object.assign(notification.style, {
      background: colors.background,
      border: `2px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '12px 16px',
      color: '#222',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      opacity: '0',
      transform: 'translateX(20px)',
      transition: 'opacity 200ms ease, transform 200ms ease',
      pointerEvents: 'auto',
      wordBreak: 'break-word',
      whiteSpace: 'pre-line'
    });

    container.appendChild(notification);

    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(20px)';

      setTimeout(() => {
        notification.remove();

        if (container.children.length === 0) {
          container.remove();
        }
      }, 200);
    }, durationMs);
  }

  return {
    debug(message) {
        log(NotificationType.DEBUG, message);
    },

    info(message, durationMs) {
        show(message, NotificationType.INFO, durationMs);
    },

    warn(message, durationMs) {
        show(message, NotificationType.WARN, durationMs);
    },

    error(message, durationMs) {
        show(message, NotificationType.ERROR, durationMs);
    },

    show
};
})();