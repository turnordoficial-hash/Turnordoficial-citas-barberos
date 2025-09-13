/**
 * Sistema de Notificaciones del Navegador
 * Maneja notificaciones automáticas para citas
 */

class BrowserNotificationManager {
    constructor() {
        this.notificationQueue = [];
        this.checkInterval = null;
        this.init();
    }

    async init() {
        await this.requestPermission();
        this.loadScheduledNotifications();
        this.startNotificationChecker();
    }

    /**
     * Solicita permisos para mostrar notificaciones
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    /**
     * Programa notificaciones para una cita
     * @param {Object} cita - Objeto de la cita
     */
    scheduleNotifications(cita) {
        const citaDateTime = new Date(`${cita.fecha}T${cita.hora}`);
        const now = new Date();

        // Notificación de confirmación inmediata
        this.showNotification(
            '✅ Cita Confirmada',
            `Tu cita con ${cita.barbero} ha sido confirmada para el ${this.formatDate(cita.fecha)} a las ${cita.hora}`,
            'confirmation'
        );

        // Notificación 1 hora antes
        const oneHourBefore = new Date(citaDateTime.getTime() - (60 * 60 * 1000));
        if (oneHourBefore > now) {
            this.scheduleNotification({
                id: `${cita.id}_1hour`,
                citaId: cita.id,
                time: oneHourBefore.getTime(),
                title: '⏰ Recordatorio de Cita',
                body: `Tu cita con ${cita.barbero} es en 1 hora (${cita.hora})`,
                type: 'reminder_1hour'
            });
        }

        // Notificación 10 minutos antes
        const tenMinutesBefore = new Date(citaDateTime.getTime() - (10 * 60 * 1000));
        if (tenMinutesBefore > now) {
            this.scheduleNotification({
                id: `${cita.id}_10min`,
                citaId: cita.id,
                time: tenMinutesBefore.getTime(),
                title: '🚨 ¡Tu cita es muy pronto!',
                body: `Tu cita con ${cita.barbero} es en 10 minutos. ¡No llegues tarde!`,
                type: 'reminder_10min'
            });
        }
    }

    /**
     * Programa una notificación específica
     * @param {Object} notification - Datos de la notificación
     */
    scheduleNotification(notification) {
        this.notificationQueue.push(notification);
        this.saveScheduledNotifications();
    }

    /**
     * Muestra una notificación inmediata
     * @param {string} title - Título de la notificación
     * @param {string} body - Cuerpo de la notificación
     * @param {string} type - Tipo de notificación
     */
    async showNotification(title, body, type = 'default') {
        if (Notification.permission !== 'granted') {
            // Fallback a notificación en pantalla si no hay permisos
            this.showInPageNotification(title, body, type);
            return;
        }

        try {
            const notification = new Notification(title, {
                body: body,
                icon: this.getIconForType(type),
                badge: '/favicon.ico',
                tag: type,
                requireInteraction: type.includes('reminder'),
                silent: false
            });

            // Auto-cerrar después de 5 segundos para confirmaciones
            if (type === 'confirmation') {
                setTimeout(() => notification.close(), 5000);
            }

            // Manejar click en la notificación
            notification.onclick = () => {
                window.focus();
                notification.close();
                if (type.includes('reminder')) {
                    // Navegar a la página de citas
                    window.location.href = 'citas.html';
                }
            };

        } catch (error) {
            console.error('Error mostrando notificación:', error);
            this.showInPageNotification(title, body, type);
        }
    }

    /**
     * Muestra notificación en la página como fallback
     * @param {string} title - Título
     * @param {string} body - Cuerpo
     * @param {string} type - Tipo
     */
    showInPageNotification(title, body, type) {
        if (typeof TurnORDUtils !== 'undefined') {
            const isSuccess = type === 'confirmation';
            TurnORDUtils.showNotification(body, isSuccess ? 'success' : 'info');
        } else {
            // Fallback básico
            alert(`${title}\n\n${body}`);
        }
    }

    /**
     * Obtiene el icono según el tipo de notificación
     * @param {string} type - Tipo de notificación
     * @returns {string} URL del icono
     */
    getIconForType(type) {
        const icons = {
            confirmation: '✅',
            reminder_1hour: '⏰',
            reminder_10min: '🚨',
            default: '📅'
        };
        return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icons[type] || icons.default}</text></svg>`;
    }

    /**
     * Inicia el verificador de notificaciones programadas
     */
    startNotificationChecker() {
        // Verificar cada 30 segundos
        this.checkInterval = setInterval(() => {
            this.checkScheduledNotifications();
        }, 30000);

        // Verificar inmediatamente
        this.checkScheduledNotifications();
    }

    /**
     * Verifica y ejecuta notificaciones programadas
     */
    checkScheduledNotifications() {
        const now = Date.now();
        const toExecute = [];
        const remaining = [];

        this.notificationQueue.forEach(notification => {
            if (notification.time <= now) {
                toExecute.push(notification);
            } else {
                remaining.push(notification);
            }
        });

        // Ejecutar notificaciones pendientes
        toExecute.forEach(notification => {
            this.showNotification(notification.title, notification.body, notification.type);
        });

        // Actualizar cola con notificaciones restantes
        this.notificationQueue = remaining;
        if (toExecute.length > 0) {
            this.saveScheduledNotifications();
        }
    }

    /**
     * Cancela notificaciones de una cita específica
     * @param {string} citaId - ID de la cita
     */
    cancelNotifications(citaId) {
        this.notificationQueue = this.notificationQueue.filter(
            notification => notification.citaId !== citaId
        );
        this.saveScheduledNotifications();
    }

    /**
     * Guarda notificaciones programadas en localStorage
     */
    saveScheduledNotifications() {
        try {
            localStorage.setItem('scheduledNotifications', JSON.stringify(this.notificationQueue));
        } catch (error) {
            console.error('Error guardando notificaciones programadas:', error);
        }
    }

    /**
     * Carga notificaciones programadas desde localStorage
     */
    loadScheduledNotifications() {
        try {
            const saved = localStorage.getItem('scheduledNotifications');
            if (saved) {
                this.notificationQueue = JSON.parse(saved);
                // Limpiar notificaciones expiradas (más de 24 horas)
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                this.notificationQueue = this.notificationQueue.filter(
                    notification => notification.time > oneDayAgo
                );
                this.saveScheduledNotifications();
            }
        } catch (error) {
            console.error('Error cargando notificaciones programadas:', error);
            this.notificationQueue = [];
        }
    }

    /**
     * Formatea una fecha para mostrar
     * @param {string} fecha - Fecha en formato YYYY-MM-DD
     * @returns {string} Fecha formateada
     */
    formatDate(fecha) {
        const date = new Date(fecha + 'T00:00:00');
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Detiene el verificador de notificaciones
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Obtiene estadísticas de notificaciones
     * @returns {Object} Estadísticas
     */
    getStats() {
        return {
            permission: Notification.permission,
            queueLength: this.notificationQueue.length,
            nextNotification: this.notificationQueue.length > 0 
                ? new Date(Math.min(...this.notificationQueue.map(n => n.time)))
                : null
        };
    }
}

// Crear instancia global
const notificationManagerInstance = new BrowserNotificationManager();
window.BrowserNotificationManager = notificationManagerInstance;
// Mantener compatibilidad con código existente
window.NotificationManager = notificationManagerInstance;

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserNotificationManager;
}