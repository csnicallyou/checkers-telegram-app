// Хранилище администраторов
class AdminManager {
    constructor() {
        this.adminIds = new Set();
        this.pendingRequests = new Map(); // userId -> { timestamp, gameId }
        this.loadAdmins();
    }

    // Загружаем админов из localStorage
    loadAdmins() {
        try {
            const saved = localStorage.getItem('checkers_admins');
            if (saved) {
                const admins = JSON.parse(saved);
                this.adminIds = new Set(admins);
            }
        } catch (e) {
            console.error('Ошибка загрузки админов:', e);
        }
    }

    // Сохраняем админов в localStorage
    saveAdmins() {
        try {
            localStorage.setItem('checkers_admins', JSON.stringify([...this.adminIds]));
        } catch (e) {
            console.error('Ошибка сохранения админов:', e);
        }
    }

    // Добавить администратора
    addAdmin(userId) {
        this.adminIds.add(Number(userId));
        this.saveAdmins();
        console.log('✅ Админ добавлен:', userId);
    }

    // Удалить администратора
    removeAdmin(userId) {
        this.adminIds.delete(Number(userId));
        this.saveAdmins();
        console.log('❌ Админ удален:', userId);
    }

    // Проверить, является ли пользователь админом
    isAdmin(userId) {
        return this.adminIds.has(Number(userId));
    }

    // Получить список админов
    getAdmins() {
        return [...this.adminIds];
    }

    // Создать запрос на админку
    createRequest(userId, gameId) {
        this.pendingRequests.set(userId, {
            timestamp: Date.now(),
            gameId
        });
    }

    // Проверить запрос
    checkRequest(userId) {
        const request = this.pendingRequests.get(userId);
        if (!request) return null;
        
        // Запрос действителен 5 минут
        if (Date.now() - request.timestamp > 5 * 60 * 1000) {
            this.pendingRequests.delete(userId);
            return null;
        }
        
        return request;
    }

    // Удалить запрос
    removeRequest(userId) {
        this.pendingRequests.delete(userId);
    }
}

export const adminManager = new AdminManager();