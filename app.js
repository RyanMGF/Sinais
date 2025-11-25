document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT & INITIALIZATION ---
    // Helper to check if two dates are on the same day
    const isSameDay = (d1, d2) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    // Helper to check if d2 is the day right after d1
    const isConsecutiveDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        const nextDay = new Date(d1);
        nextDay.setHours(0, 0, 0, 0);
        nextDay.setDate(d1.getDate() + 1);
        return isSameDay(nextDay, d2);
    };

    // This function is now outside the DOMContentLoaded to be testable
    // It depends on isSameDay and isConsecutiveDay
    const calculateStreaks = (checkins) => {
        if (!checkins || checkins.length === 0) return { current: 0, longest: 0 };

        const uniqueDays = [...new Set(checkins.map(c => new Date(c.createdAt).toDateString()))]
            .map(dateStr => new Date(dateStr))
            .sort((a, b) => a - b);

        if (uniqueDays.length === 0) return { current: 0, longest: 0 };

        let longestStreak = 0;
        let currentLongest = 0;
        if (uniqueDays.length > 0) {
            currentLongest = 1;
            longestStreak = 1;
        }

        for (let i = 1; i < uniqueDays.length; i++) {
            if (isConsecutiveDay(uniqueDays[i - 1], uniqueDays[i])) {
                currentLongest++;
            } else if (!isSameDay(uniqueDays[i - 1], uniqueDays[i])) {
                longestStreak = Math.max(longestStreak, currentLongest);
                currentLongest = 1;
            }
        }
        longestStreak = Math.max(longestStreak, currentLongest);

        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastCheckinDay = uniqueDays[uniqueDays.length - 1];

        if (isSameDay(today, lastCheckinDay)) {
            currentStreak = currentLongest;
        } else if (isConsecutiveDay(lastCheckinDay, today)) {
            // The user hasn't checked in today, but their streak is ongoing until midnight.
            currentStreak = currentLongest;
        } else {
            // The streak is broken
            currentStreak = 0;
        }

        // A special case: if the last check-in was yesterday, the current streak is what we calculated.
        // If it was before yesterday, the current streak is 0.
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (!isSameDay(today, lastCheckinDay) && !isSameDay(yesterday, lastCheckinDay)) {
            currentStreak = 0;
        }

        return { current: currentStreak, longest: longestStreak };
    };

    const state = {
        currentScreen: 'onboarding-screen',
        checkins: [],
        currentMood: null,
        currentTags: [],
        isAuthenticated: false,
        pieChart: null,
        weeklyBarChart: null,
        editingCheckinId: null,
        editingTags: [],
        calendarDate: new Date(),
        selectedDate: null,
        isZenMode: false,
        streaks: { current: 0, longest: 0 },
        unlockedAchievements: [],
        gratitudeEntries: [],
        goalsSortable: null,
        archivedGoalsSortable: null,
        tagsSortable: null,
        editingTagForIcon: null,
        editingGratitudeId: null, 
        goals: [],
        historyFilterTag: null,
        favoriteContacts: [], // Contatos de confiança
        theme: 'auto', // Default to auto-detect system theme
        predefinedTags: ["Trabalho", "Família", "Relacionamentos", "Saúde", "Lazer", "Estudos", "Finanças", "Pessoal"], // Default tags
        onboardingStep: 0,
        tourStep: -1,
        isFocusMode: false,
        reminderEnabled: false,
        reminderTime: '20:00', // Default reminder time
        nextNotificationTimeoutId: null,
        motivationalQuotes: [
            { quote: "Acredite em você mesmo e tudo será possível.", author: "Autor Desconhecido", userAdded: false },
            { quote: "O único modo de fazer um excelente trabalho é amar o que você faz.", author: "Steve Jobs", userAdded: false },
            { quote: "A persistência realiza o impossível.", author: "Provérbio Chinês", userAdded: false },
            { quote: "Não espere por uma crise para descobrir o que é importante em sua vida.", author: "Platão", userAdded: false },
            { quote: "Sua única limitação é você mesmo.", author: "Autor Desconhecido", userAdded: false },
            { quote: "Comece onde você está. Use o que você tem. Faça o que você pode.", author: "Arthur Ashe", userAdded: false },
            { quote: "A jornada de mil milhas começa com um único passo.", author: "Lao Tsé", userAdded: false },
            { quote: "A felicidade não é algo pronto. Ela vem de suas próprias ações.", author: "Dalai Lama", userAdded: false },
            { quote: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier", userAdded: false },
            { quote: "Se você pode sonhar, você pode realizar.", author: "Walt Disney", userAdded: false },
            { quote: "A melhor maneira de prever o futuro é criá-lo.", author: "Peter Drucker", userAdded: false }
        ],
    };

    // --- MOCK DATA ---
    const achievementsData = [
        { id: 'streak-3', title: 'Início Consistente', description: 'Registrou o humor por 3 dias seguidos.', icon: 'award', requirement: { type: 'streak', value: 3 } },
        { id: 'streak-7', title: 'Hábito Semanal', description: 'Registrou o humor por 7 dias seguidos.', icon: 'calendar', requirement: { type: 'streak', value: 7 } },
        { id: 'streak-14', title: 'Jornada de Autocuidado', description: 'Registrou o humor por 14 dias seguidos.', icon: 'trending-up', requirement: { type: 'streak', value: 14 } },
        { id: 'streak-30', title: 'Mestre da Consciência', description: 'Registrou o humor por 30 dias seguidos.', icon: 'shield', requirement: { type: 'streak', value: 30 } },
    ];

    // A lista de tags foi movida para o objeto 'state' para ser personalizável
    const mockResources = [
        // Contextual resources based on tags
        { id: "10", title: "Lidando com Pressão no Trabalho", description: "Estratégias para gerenciar o estresse profissional.", type: "article", contentUrl: "https://www.zendesk.com.br/blog/lidar-com-pressao-no-trabalho/", icon: "briefcase", category: "contextual", tags: ["Trabalho"] },
        { id: "11", title: "Comunicação Familiar Positiva", description: "Dicas para melhorar o diálogo com seus familiares.", type: "article", contentUrl: "https://online.pucrs.br/blog/comunicacao-familiar-estrategias", icon: "users", category: "contextual", tags: ["Família"] },
        { id: "12", title: "Cuidando da Saúde Mental", description: "Um guia para priorizar seu bem-estar emocional.", type: "video", contentUrl: "https://vidasaudavel.einstein.br/como-cuidar-da-saude-mental/", icon: "activity", category: "contextual", tags: ["Saúde", "Pessoal"] },
        { id: "13", title: "Finanças e Bem-estar", description: "Como a organização financeira impacta suas emoções.", type: "article", contentUrl: "https://warren.com.br/magazine/bem-estar-financeiro/", icon: "dollar-sign", category: "contextual", tags: ["Finanças"] },
        { id: "14", title: "Como Lidar com a Pressão nos Estudos", description: "Dicas para organizar sua rotina e evitar o esgotamento.", type: "article", contentUrl: "https://blog.grupointegrado.br/pressao-academica/", icon: "book-open", category: "contextual", tags: ["Estudos"] },
        { id: "15", title: "A Importância do Lazer para a Saúde Mental", description: "Entenda por que ter um hobby e relaxar é fundamental.", type: "video", contentUrl: "https://www.youtube.com/watch?v=utcoAJQDHGM", icon: "sun", category: "contextual", tags: ["Lazer"] },
        { id: "16", title: "Como Melhorar seus Relacionamentos", description: "Aprenda sobre comunicação e empatia nas suas relações.", type: "article", contentUrl: "https://www.youtube.com/watch?v=E0kzk_Ftjlo", icon: "heart", category: "contextual", tags: ["Relacionamentos"] },
        // General Calm/Release resources
        { id: "1", title: "Respiração Diafragmática", description: "Aprenda a controlar a ansiedade com este exercício simples.", type: "video", contentUrl: "https://www.youtube.com/watch?v=Waf3kZkpGq4", icon: "wind", category: "calm", tags: [] },
        { id: "2", title: "Meditação Guiada para Acalmar", description: "Relaxe e encontre seu centro com esta meditação de 5 minutos.", type: "audio", contentUrl: "https://www.youtube.com/watch?v=pv-aymg97JM", icon: "headphones", category: "calm", tags: [] },
        { id: "3", title: "O Poder da Escrita Terapêutica", description: "Entenda como escrever sobre seus sentimentos pode clarear a mente.", type: "article", contentUrl: "https://www.youtube.com/watch?v=H2i4yEF8wIA", icon: "edit-3", category: "release", tags: [] },
        { id: "4", title: "Movimente o Corpo", description: "Uma caminhada ou dança pode ajudar a aliviar o estresse. Veja os benefícios.", type: "video", contentUrl: "https://www.youtube.com/watch?v=98aKpjFwd4s", icon: "activity", category: "release", tags: [] },
        // General resources
        { id: "9", title: "O Poder do Pensamento Positivo", description: "Um vídeo sobre como mudar sua perspectiva.", type: "video", contentUrl: "https://www.youtube.com/watch?v=NVV5acjrcJE", icon: "youtube", category: "general", tags: [] },
    ];
    const contextualTipsData = {
        "Estudos": {
            icon: "book-open",
            title: "Lidando com a Pressão dos Estudos",
            texts: [
                "Divida suas tarefas em partes menores e celebre cada pequena conquista. Lembre-se de fazer pausas regulares para descansar a mente.",
                "Tente a técnica Pomodoro: 25 minutos de foco intenso e 5 minutos de descanso. Isso pode aumentar sua produtividade e diminuir a ansiedade.",
                "Conversar com colegas sobre as dificuldades também pode aliviar o peso. Vocês não estão sozinhos nisso."
            ]
        },
        "Trabalho": {
            icon: "briefcase",
            title: "Gerenciando o Estresse no Trabalho",
            texts: [
                "Defina limites claros entre o trabalho e a vida pessoal. Desconectar é essencial para recarregar as energias.",
                "Tente identificar a fonte do estresse. É uma tarefa específica? Um relacionamento? Saber a causa é o primeiro passo para resolver.",
                "Pequenas pausas durante o dia são essenciais. Levante-se, alongue-se ou apenas olhe pela janela por alguns minutos."
            ]
        },
        "Família": {
            icon: "users",
            title: "Navegando em Dinâmicas Familiares",
            texts: [
                "A comunicação aberta é fundamental. Tente expressar seus sentimentos de forma calma, usando frases como 'Eu sinto que...' em vez de acusações.",
                "Lembre-se de que você não pode controlar a reação dos outros, mas pode controlar a sua. Respire fundo antes de responder.",
                "Às vezes, um pouco de distância pode ser saudável. Permita-se ter seu próprio espaço para processar as emoções."
            ]
        },
        "Relacionamentos": {
            icon: "heart",
            title: "Cuidando dos seus Relacionamentos",
            texts: [
                "Seja honesto(a) sobre seus sentimentos com a outra pessoa, mas escolha um bom momento para a conversa, quando ambos estiverem calmos.",
                "Escutar ativamente é tão importante quanto falar. Tente entender o ponto de vista do outro sem interromper.",
                "Reserve um tempo de qualidade para se conectar, mesmo que seja algo simples. A intenção de estar presente faz toda a diferença."
            ]
        },
        "Finanças": {
            icon: "dollar-sign",
            title: "Enfrentando a Ansiedade Financeira",
            texts: [
                "O primeiro passo é organizar. Crie um orçamento simples para entender para onde seu dinheiro está indo. Conhecimento é poder.",
                "Se a situação for complexa, buscar orientação de um profissional pode trazer clareza e alívio. Não hesite em pedir ajuda.",
                "Foque em pequenos passos. Que tal cortar um gasto supérfluo essa semana ou pesquisar uma forma de renda extra? Cada passo conta."
            ]
        },
        // A generic tip if no specific tag matches
        "generic": {
            icon: "life-buoy",
            title: "Um Passo de Cada Vez",
            texts: [
                "Reconhecer que você não está bem é um ato de coragem. Permita-se sentir, mas lembre-se de que as emoções são passageiras.",
                "Respire fundo, contando até quatro ao inspirar e até seis ao expirar. Isso ajuda a acalmar o sistema nervoso.",
                "Seja gentil com você mesmo hoje. Permita-se fazer algo que te conforte, por menor que seja.",
                "Lembre-se: sentimentos são como nuvens, eles vêm e vão. Esta sensação não durará para sempre.",
                "Foque no presente. O que você pode fazer nos próximos 5 minutos para se sentir um pouco melhor? Um copo d'água? Uma música?",
                "Escrever sobre o que você está sentindo pode ajudar a organizar os pensamentos e aliviar a pressão.",
                "Você é mais forte do que pensa. Você já superou 100% dos seus dias ruins até hoje.",
                "Não se cobre perfeição. Apenas o fato de estar aqui, tentando, já é uma grande vitória.",
                "O autocuidado não é egoísmo. É uma necessidade. O que seu corpo e sua mente estão pedindo agora?",
                "Lembre-se de que você pode encontrar mais ferramentas e apoio na nossa seção de Recursos."
            ]
        },
    };

    const nextTourStep = () => {
        if (state.tourStep === -1) return; // Tour não está ativo
        state.tourStep++;
        showTourStep(state.tourStep);
    };

    const tourSteps = [
        {
            element: '#onboarding-content-wrapper', // Elemento genérico para a primeira tela
            title: 'Bem-vindo(a) ao Sinais!',
            text: 'Vamos fazer um tour rápido para você conhecer as ferramentas principais. Sua jornada de autoconhecimento começa agora.',
            action: () => navigateTo('checkin-screen') // Garante que a tela de check-in esteja pronta
        },
        {
            element: '#checkin-screen .space-y-4',
            title: '1/3: Registre sua Emoção',
            text: 'O primeiro passo é simples: escolha a cor que melhor representa como você se sente neste momento. Toque em uma delas para continuar.',
            interactive: true,
            // Ação do usuário (clique no botão de humor) avançará o tour
        },
        {
            element: '#save-checkin-btn',
            title: '2/3: Adicione Contexto',
            text: 'Ótimo! Agora, você pode adicionar tags e notas para entender melhor o que influenciou seu sentimento. Clique em "Salvar Registro" para avançar.',
            interactive: true,
            // Ação do usuário (submit do formulário) avançará o tour
        },
        {
            element: '.nav-btn[data-screen="journey-screen"]',
            title: '3/3: Acompanhe sua Jornada',
            text: 'Perfeito! Todos os seus registros ficam salvos na sua Jornada. Lá você pode ver seu histórico, estatísticas e muito mais.',
            action: () => {
                // Navega de volta para a tela principal para mostrar a barra de navegação
                navigateTo('checkin-screen');
            }
        }
    ];
    const availableIcons = [
        'tag', 'briefcase', 'users', 'heart', 'activity', 'sun', 'book-open', 'dollar-sign',
        'home', 'user', 'moon', 'coffee', 'film', 'music', 'shopping-cart', 'gift',
        'award', 'anchor', 'aperture', 'battery-charging', 'bell', 'bluetooth', 'camera',
        'cast', 'check-circle', 'cloud', 'codepen', 'cpu', 'credit-card', 'database',
        'disc', 'droplet', 'feather', 'figma', 'flag', 'folder', 'globe', 'hash',
        'headphones', 'image', 'inbox', 'key', 'layers', 'layout', 'link', 'lock',
        'map-pin', 'mic', 'monitor', 'mouse-pointer', 'package', 'pen-tool', 'power',
        'printer', 'save', 'scissors', 'send', 'server', 'shield', 'smartphone',
        'speaker', 'star', 'tablet', 'target', 'thermometer', 'thumbs-up', 'tool',
        'trash-2', 'trending-up', 'truck', 'tv', 'umbrella', 'video', 'watch',
        'wifi', 'wind', 'zap'
    ];

    // --- DOM ELEMENTS ---
    const onboardingSteps = [
        {
            icon: 'heart',
            title: 'Bem-vindo(a) ao Sinais',
            text: 'Seu espaço seguro para navegar pelas emoções, entender seus padrões e cuidar do seu bem-estar.'
        },
        {
            icon: 'edit-3',
            title: 'Registre Suas Emoções',
            text: 'Use as cores para fazer um check-in rápido de como você se sente. Adicione notas e tags para mais contexto.'
        },
        {
            icon: 'trending-up',
            title: 'Acompanhe Sua Jornada',
            text: 'Visualize seu histórico em gráficos, calendário e estatísticas para descobrir padrões e celebrar seu progresso.'
        },
        {
            icon: 'life-buoy',
            title: 'Encontre Recursos de Apoio',
            text: 'Acesse uma biblioteca de artigos, vídeos e sua rede de apoio pessoal sempre que precisar de ajuda.'
        }
    ];
    const screens = document.querySelectorAll('.screen');
    const navButtons = document.querySelectorAll('.nav-btn');
    const header = document.getElementById('app-header');
    const headerTitle = header.querySelector('h1');
    const bottomNav = document.getElementById('bottom-nav');
    const navSpacer = document.getElementById('nav-spacer');
    const editModal = document.getElementById('edit-modal');

    // Centralized mood colors for consistency
    const moodColors = {
        verde: 'rgb(34, 197, 94)',   // green-500
        amarelo: 'rgb(251, 191, 36)', // amber-400
        vermelho: 'rgb(239, 68, 68)',  // red-500
    };
    
    // --- UTILITY FUNCTIONS ---
    const getMoodColor = (mood) => ({
        verde: 'bg-green-500',
        amarelo: 'bg-amber-400',
        vermelho: 'bg-red-500'
    }[mood] || 'bg-gray-400');

    const getMoodBorderColor = (mood) => ({
        verde: 'border-green-500',
        amarelo: 'border-amber-400',
        vermelho: 'border-red-500'
    }[mood] || 'border-gray-400');

    const getMoodName = (mood) => ({
        verde: 'Bem',
        amarelo: 'Ok',
        vermelho: 'Mal'
    }[mood] || 'N/A');

    const triggerConfetti = () => {
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
        });
    };

    const vibrate = (duration = 50) => {
        if (state.isFocusMode) return;
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    };

    // --- AUDIO FEEDBACK ---
    // A short, subtle click sound encoded in Base64 to avoid an extra file request.
    const clickSound = new Audio('data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU3LjU2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');

    const playClickSound = () => {
        if (state.isFocusMode) return;
        // Allows the sound to be played again quickly
        clickSound.currentTime = 0;
        clickSound.play().catch(error => {
            // Autoplay was prevented, which is common in browsers. No need to log this.
        });
    };

    const getContrastingTextColor = (hexColor) => {
        if (!hexColor) return '#000000';
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    };

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };
    // --- DATA PERSISTENCE (localStorage) ---
    const loadState = () => {
        // Para o modo de exposição, os dados não são carregados para garantir
        // que a tela de boas-vindas seja sempre exibida no início.
        // O estado inicial padrão será usado a cada recarga.
    };

    const saveState = () => {
        // Para o modo de exposição, os dados não são salvos para garantir
        // que cada sessão seja nova e independente, sem persistir informações.
    };

    const applyTheme = (theme) => {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.dataset.theme = 'dark';
            } else {
                // When system is light, remove the attribute to fall back to :root styles
                document.documentElement.removeAttribute('data-theme');
            }
        } else {
            document.documentElement.dataset.theme = theme;
        }
        updateThemeSelector();
    };

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        if (state.theme === 'auto') {
            if (event.matches) {
                document.documentElement.dataset.theme = "dark";
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    });

    // --- RENDERING & UI UPDATES ---
    const navigateTo = (screenId) => {
        state.currentScreen = screenId;
        let activeNavIndex = -1;
        screens.forEach(s => s.style.display = 'none');
        const screenEl = document.getElementById(screenId);

        // Use 'flex' for screens that are designed as flex containers for centering
        if (screenEl.classList.contains('flex')) {
            screenEl.style.display = 'flex';
        } else {
            screenEl.style.display = 'block';
        }
        // Update nav button styles
        navButtons.forEach((btn, index) => {
            if (btn.dataset.screen === screenId) {
                btn.classList.add('text-accent');
                btn.classList.remove('text-text-muted');
                activeNavIndex = index;
            } else {
                btn.classList.add('text-text-muted');
                btn.classList.remove('text-accent');
            }
        });

        // Update navigation indicator position
        const indicator = document.getElementById('nav-indicator');
        if (activeNavIndex !== -1) {
            const percentage = (activeNavIndex * 25) + 12.5; // 12.5%, 37.5%, 62.5%, 87.5%
            indicator.style.left = `calc(${percentage}% - 3px)`; // Center the 6px dot
        }


        // Update header title
        const titles = {
            'checkin-screen': 'Como você está?',
            'mandatory-contact-screen': 'Rede de Apoio',
            'journey-screen': 'Sua Jornada',
            'history-screen': 'Meu Histórico',
            'goals-screen': 'Minhas Metas',
            'gratitude-journal-screen': 'Diário de Gratidão',
            'quote-screen': 'Frase do Dia',
            'achievements-screen': 'Minhas Conquistas',
            'contextual-tips-screen': 'Dicas para Você',
            'diagnosis-screen': 'Diagnóstico Semanal',
            'resources-screen': 'Recursos e Ajuda',
            'stats-screen': 'Estatísticas',
            'settings-screen': 'Ajustes',
            'specialists-list-screen': 'Fale com um Especialista',
            'qr-code-screen': 'Acessar no Celular',
        };
        headerTitle.textContent = titles[screenId] || '';
        feather.replace(); // Ensure icons are always rendered on navigation

        if (screenId === 'onboarding-screen') {
            renderOnboardingStep();
        }
        if (screenId === 'details-screen') {
            renderPredefinedTags('predefined-tags-container', state.currentTags);
        }
        if (screenId === 'journey-screen') {
            feather.replace();
        }
        if (screenId === 'settings-screen') {
            renderFocusModeToggle();
            renderReminderSettings();
            renderTagManagement();
        }
        if (screenId === 'achievements-screen') {
            renderAchievements();
        }
        if (screenId === 'goals-screen') {
            renderGoals();
        }
        if (screenId === 'gratitude-journal-screen') {
            renderGratitudeJournal();
        }
        if (screenId === 'quote-screen') {
            renderQuoteOfTheDay();
        }
        if (screenId === 'history-screen') {
            renderHistory();
        }
        if (screenId === 'resources-screen') {
            renderResources();
            renderEmergencyContacts();
        }
        if (screenId === 'diagnosis-screen') {
            renderDiagnosis();
        }
        if (screenId === 'stats-screen') {
            renderStatistics();
        }
        if (screenId === 'immediate-chat-screen') {
            // Hide main header/nav for a focused chat experience
            toggleMainUI(false);
        }
    };

    const renderOnboardingStep = () => {
        const contentWrapper = document.getElementById('onboarding-content-wrapper');
        const stepData = onboardingSteps[state.onboardingStep];
        if (!stepData) return;

        // Update content
        contentWrapper.querySelector('#onboarding-icon-container').innerHTML = `<i data-feather="${stepData.icon}" class="w-24 h-24 text-accent"></i>`;
        contentWrapper.querySelector('#onboarding-title').textContent = stepData.title;
        contentWrapper.querySelector('#onboarding-text').textContent = stepData.text;
        feather.replace();

        // Render dots
        const dotsContainer = document.getElementById('onboarding-dots');
        dotsContainer.innerHTML = onboardingSteps.map((_, index) => {
            const activeClass = index === state.onboardingStep ? 'bg-accent' : 'bg-bg-tertiary';
            return `<div class="w-2.5 h-2.5 rounded-full transition-all duration-300 ${activeClass}"></div>`;
        }).join('');

        // Update buttons
        const prevBtn = document.getElementById('onboarding-prev-btn');
        const nextBtn = document.getElementById('onboarding-next-btn');

        if (state.onboardingStep === 0) {
            prevBtn.style.opacity = '0';
            prevBtn.style.pointerEvents = 'none';
        } else {
            prevBtn.style.opacity = '1';
            prevBtn.style.pointerEvents = 'auto';
        }

        if (state.onboardingStep === onboardingSteps.length - 1) {
            nextBtn.textContent = 'Começar';
            nextBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            nextBtn.classList.remove('bg-accent', 'hover:bg-accent-hover');
        } else {
            nextBtn.textContent = 'Próximo';
            nextBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
            nextBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
        }
    };

    const transitionOnboardingStep = (direction) => {
        const contentWrapper = document.getElementById('onboarding-content-wrapper');        
        contentWrapper.style.animation = 'fadeOut 0.25s ease-in forwards';

        setTimeout(() => {
            state.onboardingStep += (direction === 'next' ? 1 : -1);
            renderOnboardingStep();
            contentWrapper.style.animation = 'fadeIn 0.25s ease-out forwards';
        }, 250); // Half of the animation duration
    };

    const renderPredefinedTags = (containerId, selectedTags) => {
        const container = document.getElementById(containerId);
        container.innerHTML = state.predefinedTags.map(tag => {
            const isSelected = selectedTags.includes(tag.name);
            const baseClasses = 'px-4 py-2 rounded-full cursor-pointer transition-all text-sm font-semibold flex items-center gap-2';
            let style = '';
            let classes = 'bg-bg-tertiary text-text-primary hover:opacity-80';

            if (isSelected) {
                const textColor = getContrastingTextColor(tag.color);
                style = `background-color: ${tag.color}; color: ${textColor}; border-color: ${tag.color};`;
                classes = '';
            }
            
            return `<button type="button" data-tag="${tag.name}" class="predefined-tag-btn ${baseClasses} ${classes}" style="${style}">
                        <i data-feather="${tag.icon}" class="w-4 h-4"></i>
                        <span>${tag.name}</span>
                    </button>`;
        }).join('');
        feather.replace();
    };

    const renderTagManagement = () => {
        const container = document.getElementById('tag-management-list');
        if (!container) return;
        container.innerHTML = state.predefinedTags.map(tag => `
            <div class="tag-item bg-bg-secondary p-3 rounded-lg border border-border-primary flex items-center gap-3" data-tag-name="${tag.name}">
                <i data-feather="grip-vertical" class="drag-handle text-text-muted cursor-move"></i>
                <button class="change-tag-icon-btn p-1 rounded-md hover:bg-bg-tertiary" data-tag-name="${tag.name}">
                    <i data-feather="${tag.icon}" class="w-5 h-5 text-accent"></i>
                </button>
                <label class="relative">
                    <input type="color" class="tag-color-picker" value="${tag.color}" data-tag-name="${tag.name}">
                </label>
                <span class="font-semibold flex-grow">${tag.name}</span>
                <button data-tag="${tag}" class="remove-managed-tag-btn text-text-muted hover:text-red-500">
                    <i data-feather="x-circle" class="w-5 h-5"></i>
                </button>
            </div>
        `).join('');
        feather.replace();
    };

    const renderEmergencyContacts = () => {
        const container = document.getElementById('favorite-contacts-container');
        if (state.favoriteContacts.length === 0) {
            container.innerHTML = `
                <div class="pt-6 border-t border-red-500/20">
                    <p class="text-sm text-center text-text-secondary">Nenhum contato de apoio adicionado ainda.</p>
                </div>
            `;
            return;
        }
        container.innerHTML = `
            <div class="pt-6 border-t border-red-500/20">
                <h3 class="text-xl font-bold mb-2 text-center text-text-primary">Sua Rede de Apoio</h3>
                <p class="text-sm text-center text-text-secondary mb-4">Lembre-se das pessoas que se importam. Uma conversa pode fazer toda a diferença.</p>
                <div id="resources-contacts-list" class="space-y-3">
                    ${state.favoriteContacts.map(contact => `
                        <div class="bg-bg-secondary p-2 rounded-lg border border-border-primary flex items-center justify-between gap-2">
                            <a href="tel:${contact.phone}" class="flex-grow flex items-center gap-3 p-2 rounded-md hover:bg-bg-tertiary">
                                <i data-feather="user" class="w-6 h-6 text-accent"></i>
                                <span class="text-lg font-semibold">${contact.name}</span>
                            </a>
                            <button data-id="${contact.id}" class="remove-resources-contact-btn text-text-muted hover:text-red-500 p-2 rounded-md hover:bg-bg-tertiary">
                                <i data-feather="trash-2" class="w-5 h-5"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        feather.replace();
    };

    const renderContextualTips = () => {
        const tipsContainer = document.getElementById('tips-container');
        const lastCheckin = state.checkins.length > 0 ? [...state.checkins].sort((a, b) => b.createdAt - a.createdAt)[0] : null;
        
        if (!lastCheckin) {
            tipsContainer.innerHTML = '';
            return;
        }

        const checkinTags = lastCheckin.tags;
        let tipsHTML = '';

        const createTipCard = (tip) => {
            // Select a random tip text from the array
            const randomText = tip.texts[Math.floor(Math.random() * tip.texts.length)];
            return `
            <div class="bg-bg-tertiary p-5 rounded-lg">
                <div class="flex items-center gap-3 mb-3">
                    <i data-feather="${tip.icon}" class="w-6 h-6 text-accent"></i>
                    <h4 class="text-xl font-bold">${tip.title}</h4>
                </div>
                <p class="text-text-primary">${randomText}</p>
            </div>
        `;
        };

        if (checkinTags.length > 0) {
            checkinTags.forEach(tag => {
                if (contextualTipsData[tag]) {
                    tipsHTML += createTipCard(contextualTipsData[tag]);
                }
            });
        }

        if (tipsHTML === '') {
            tipsHTML = createTipCard(contextualTipsData.generic);
        }

        tipsContainer.innerHTML = tipsHTML;
        feather.replace();
    };

    const renderFeedbackScreen = (mood) => {
        const iconEl = document.getElementById('feedback-icon');
        const titleEl = document.getElementById('feedback-title');
        const messageEl = document.getElementById('feedback-message');
        const continueBtn = document.getElementById('feedback-continue-btn');

        const feedbackData = {
            verde: {
                icon: 'smile',
                color: 'text-green-500',
                title: 'Que bom!',
                message: 'É ótimo ver que você está se sentindo bem. Continue assim!',
                btnClass: 'bg-green-500 hover:bg-green-600'
            },
            amarelo: {
                icon: 'meh',
                color: 'text-amber-400',
                title: 'Obrigado por registrar.',
                message: 'Reconhecer o que sentimos é um passo importante para o autocuidado.',
                btnClass: 'bg-amber-400 hover:bg-amber-500'
            },
            vermelho: {
                icon: 'frown',
                color: 'text-red-500',
                title: 'Sinto muito por isso.',
                message: 'Lembre-se de ser gentil com você mesmo. Se precisar, procure apoio nos Recursos.',
                btnClass: 'bg-red-500 hover:bg-red-600'
            }
        };

        const data = feedbackData[mood];
        iconEl.dataset.feather = data.icon;
        iconEl.className = `w-20 h-20 ${data.color} mb-6`;
        titleEl.textContent = data.title;
        messageEl.textContent = data.message;
        continueBtn.className = `text-accent-text font-bold py-3 px-8 rounded-full shadow-lg transition-colors duration-300 ${data.btnClass}`;
        
        feather.replace();
    };

    const openEditModal = (checkinId) => {
        const checkinToEdit = state.checkins.find(c => c.id === checkinId);
        if (!checkinToEdit) return;

        state.editingCheckinId = checkinId;
        state.editingTags = [...checkinToEdit.tags];

        document.getElementById('edit-notes').value = checkinToEdit.notes;
        renderPredefinedTags('edit-predefined-tags-container', state.editingTags);
        
        editModal.classList.remove('hidden');
        const modalContent = document.getElementById('edit-modal-content');
        modalContent.classList.remove('modal-leave');
        modalContent.classList.add('modal-enter');
    };

    const closeEditModal = () => {
        state.editingCheckinId = null;
        state.editingTags = [];

        const modalContent = document.getElementById('edit-modal-content');
        modalContent.classList.remove('modal-enter');
        modalContent.classList.add('modal-leave');

        modalContent.addEventListener('animationend', (e) => {
            // Only hide if the close animation was the last one triggered
            if (modalContent.classList.contains('modal-leave')) {
                editModal.classList.add('hidden');
            }
        }, { once: true });
    };

    const renderCalendar = () => {
        const calendarGrid = document.getElementById('calendar-grid');
        const monthYearEl = document.getElementById('calendar-month-year');
        if (!calendarGrid || !monthYearEl) return;

        const now = state.calendarDate;
        const year = now.getFullYear();
        const month = now.getMonth();

        monthYearEl.textContent = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon,...
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        calendarGrid.innerHTML = '';

        // Day names header
        const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        dayNames.forEach(day => {
            calendarGrid.innerHTML += `<div class="font-bold text-sm text-text-muted">${day}</div>`;
        });

        // Blank days for padding
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.innerHTML += '<div></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(year, month, day);
            const checkinsForDay = state.checkins.filter(c => {
                const checkinDate = new Date(c.createdAt);
                return checkinDate.getFullYear() === year &&
                       checkinDate.getMonth() === month &&
                       checkinDate.getDate() === day;
            });

            let moodDot = '';
            if (checkinsForDay.length > 0) {
                let dayMood = 'verde'; // default to green
                if (checkinsForDay.some(c => c.mood === 'vermelho')) {
                    dayMood = 'vermelho';
                } else if (checkinsForDay.some(c => c.mood === 'amarelo')) {
                    dayMood = 'amarelo';
                }
                moodDot = `<div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${getMoodColor(dayMood)}"></div>`;
            }
            
            const today = new Date();
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isSelected = state.selectedDate && isSameDay(dayDate, state.selectedDate);
            const todayClass = isToday && !isSelected ? 'bg-accent-bg-light !text-accent-text-dark font-bold' : '';
            const selectedClass = isSelected ? 'bg-accent text-accent-text font-bold' : '';

            calendarGrid.innerHTML += `
                <button data-date="${dayDate.toISOString()}" class="calendar-day relative h-10 flex items-center justify-center rounded-full ${todayClass} ${selectedClass} transition-colors hover:bg-bg-tertiary">
                    <span>${day}</span>
                    ${moodDot}
                </button>
            `;
        }
    };

    const renderHistoryFilters = () => {
        const container = document.getElementById('history-tags-filter');
        const filterContainer = document.getElementById('history-filter-container');
        if (!container || !filterContainer) return;

        const allTags = [...new Set(state.checkins.flatMap(c => c.tags))];

        if (allTags.length === 0) {
            filterContainer.style.display = 'none';
            return;
        }
        filterContainer.style.display = 'block';

        let tagsHTML = '';
        
        const btnClasses = 'px-4 py-1.5 rounded-full cursor-pointer transition-colors text-sm font-semibold';
        const selectedClasses = 'bg-accent text-accent-text';
        const unselectedClasses = 'bg-bg-tertiary text-text-primary hover:opacity-80';
        
        tagsHTML += `<button type="button" data-tag="all" class="history-filter-btn ${btnClasses} ${state.historyFilterTag === null ? selectedClasses : unselectedClasses}">Todos</button>`;

        allTags.sort().forEach(tag => {
            const isSelected = state.historyFilterTag === tag;
            tagsHTML += `<button type="button" data-tag="${tag}" class="history-filter-btn ${btnClasses} ${isSelected ? selectedClasses : unselectedClasses}">${tag}</button>`;
        });

        container.innerHTML = tagsHTML;
    };

    const renderHistory = () => {
        const listContainer = document.getElementById('history-list');
        const noHistoryEl = document.getElementById('no-history');
        const historyContentEl = document.getElementById('history-content');

        const chartsContainer = document.getElementById('charts-container');
        const filterContainer = document.getElementById('history-filter-container');
        const zenModeToggle = document.getElementById('zen-mode-toggle');

        if (state.isZenMode) {
            chartsContainer.style.display = 'none';
            filterContainer.style.display = 'none';
            zenModeToggle.classList.add('text-accent');
            zenModeToggle.classList.remove('text-text-muted');
            if (state.pieChart) { state.pieChart.destroy(); state.pieChart = null; }
        } else {
            chartsContainer.style.display = 'block';
            zenModeToggle.classList.remove('text-accent');
            zenModeToggle.classList.add('text-text-muted');
        }

        feather.replace();

        renderCalendar();
        renderHistoryFilters();

        const year = state.calendarDate.getFullYear();
        const month = state.calendarDate.getMonth();

        // Filter checkins for the current calendar month to display
        const monthCheckins = state.checkins.filter(c => {
            const checkinDate = new Date(c.createdAt);
            return checkinDate.getFullYear() === year && checkinDate.getMonth() === month;
        });

        // Data for charts is based on month + tag filter
        const chartCheckins = state.historyFilterTag
            ? monthCheckins.filter(c => c.tags.includes(state.historyFilterTag))
            : monthCheckins;
        
        // Data for list is based on day filter (if active) or the same as charts
        const listCheckins = state.selectedDate
            ? monthCheckins.filter(c => new Date(c.createdAt).getDate() === state.selectedDate.getDate())
            : chartCheckins;

        if (monthCheckins.length === 0) {
            // The content is now static HTML, we just need to show/hide it.
            noHistoryEl.style.display = 'block';
            historyContentEl.style.display = 'none';
            feather.replace();
            return;
        }
        
        if (listCheckins.length === 0) {
            noHistoryEl.innerHTML = `
                <i data-feather="filter" class="w-16 h-16 mx-auto mb-4"></i>
                <p>Nenhum registro encontrado para a seleção atual.</p>
            `;
            noHistoryEl.style.display = 'block';
            historyContentEl.style.display = 'none';
            feather.replace();
            return;
        }

        noHistoryEl.style.display = 'none';
        historyContentEl.style.display = 'block';
        
        const sortedCheckins = [...listCheckins].sort((a, b) => b.createdAt - a.createdAt);

        listContainer.innerHTML = sortedCheckins.map((checkin, index) => `
            <div class="list-item-enter bg-bg-secondary p-4 rounded-lg border ${getMoodBorderColor(checkin.mood)} flex items-start gap-4" style="animation-delay: ${index * 60}ms;">
                <div class="w-3 h-3 rounded-full ${getMoodColor(checkin.mood)} mt-2 flex-shrink-0"></div>
                <div class="flex-grow">
                    <p class="font-bold">${getMoodName(checkin.mood)} - ${checkin.createdAt.toLocaleDateString('pt-BR')}</p>
                    <p class="text-text-secondary text-sm">${checkin.notes || 'Nenhuma nota adicionada.'}</p>
                    ${checkin.tags.length > 0 ? `<div class="mt-2 flex flex-wrap gap-2">${checkin.tags.map(tagName => {
                        const tag = state.predefinedTags.find(t => t.name === tagName) || { name: tagName, icon: 'tag', color: '#E5E7EB' };
                        return `<span class="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style="background-color: ${tag.color}; color: ${getContrastingTextColor(tag.color)}"><i data-feather="${tag.icon}" class="w-3 h-3"></i>${tag.name}</span>`;
                    }).join('')}</div>` : ''}
                </div>
                <div class="flex-shrink-0 flex items-center gap-3">
                    <button data-action="edit" data-id="${checkin.id}" class="edit-btn text-text-muted hover:text-accent p-1 rounded-md transition-transform active:scale-90"><i data-feather="edit-2" class="w-5 h-5"></i></button>
                    <button data-action="delete" data-id="${checkin.id}" class="delete-btn text-text-muted hover:text-red-500 p-1 rounded-md transition-transform active:scale-90"><i data-feather="trash-2" class="w-5 h-5"></i></button>
                </div>
            </div>
        `).join('');
        
        feather.replace(); // Render edit/delete icons
        if (!state.isZenMode) {
            renderCharts(chartCheckins);
        }
    };

    const renderDiagnosis = () => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const weeklyCheckins = state.checkins.filter(c => c.createdAt >= oneWeekAgo);

        const diagnosisContent = document.getElementById('diagnosis-content');
        const noDataEl = document.getElementById('no-diagnosis-data');

        if (weeklyCheckins.length === 0) {
            diagnosisContent.style.display = 'none';
            noDataEl.style.display = 'block';
            feather.replace();
            return;
        }

        diagnosisContent.style.display = 'block';
        noDataEl.style.display = 'none';

        const moodCounts = weeklyCheckins.reduce((acc, c) => {
            acc[c.mood] = (acc[c.mood] || 0) + 1;
            return acc;
        }, { verde: 0, amarelo: 0, vermelho: 0 });

        const barCtx = document.getElementById('weekly-bar-chart').getContext('2d');
        if (state.weeklyBarChart) state.weeklyBarChart.destroy();

        const rootStyles = getComputedStyle(document.documentElement);
        const chartTextColor = `rgb(${rootStyles.getPropertyValue('--chart-text-rgb')})`;
        const chartGridColor = rootStyles.getPropertyValue('--chart-grid-rgba');

        state.weeklyBarChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Bem', 'Ok', 'Mal'],
                datasets: [{
                    label: 'Contagem de Emoções',
                    data: [moodCounts.verde, moodCounts.amarelo, moodCounts.vermelho],
                    backgroundColor: [ moodColors.verde, moodColors.amarelo, moodColors.vermelho ],
                    borderRadius: 5,
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: chartTextColor }, grid: { color: chartGridColor } },
                    x: { ticks: { color: chartTextColor }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

        const titleEl = document.getElementById('diagnosis-title');
        const textEl = document.getElementById('diagnosis-text');
        const total = weeklyCheckins.length;
        const predominantMood = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b);
        let diagnosis = {};

        if (moodCounts.vermelho >= total / 2 || (predominantMood === 'vermelho' && moodCounts.vermelho > 0)) {
            diagnosis = {
                title: "Uma Semana Desafiadora",
                text: "Parece que esta foi uma semana difícil. É importante reconhecer o peso que o cenário atual, social e político, pode ter sobre nós. Lembre-se que seu sentimento é válido. Considere se conectar com grupos de apoio ou canais que fortaleçam sua comunidade. Cuidar de si é também um ato de resistência."
            };
        } else if (moodCounts.amarelo > total / 2 || predominantMood === 'amarelo') {
            diagnosis = {
                title: "Uma Semana de Alerta",
                text: "Sua semana teve momentos de atenção. Em um mundo com excesso de informações, é crucial filtrar o que consumimos. Que tal praticar o 'detox digital', checar as fontes das notícias e buscar conversas que construam, em vez de apenas drenar? O equilíbrio é fundamental para a ação consciente."
            };
        } else {
            diagnosis = {
                title: "Uma Semana Positiva!",
                text: "Que ótimo ver uma semana com mais bem-estar! Essa energia positiva é um recurso valioso. Já pensou em usá-la para se engajar em uma causa local, aprender mais sobre os direitos da sua comunidade ou simplesmente compartilhar uma conversa construtiva com alguém? Pequenas ações fortalecem o coletivo."
            };
        }

        titleEl.textContent = diagnosis.title;
        textEl.textContent = diagnosis.text;
    };

    const renderStatistics = () => {
        const statsContent = document.getElementById('stats-content');
        const noStatsData = document.getElementById('no-stats-data');

        if (state.checkins.length < 3) { // Require a few checkins for meaningful stats
            statsContent.style.display = 'none';
            noStatsData.style.display = 'block';
            feather.replace();
            return;
        }

        statsContent.style.display = 'block';
        noStatsData.style.display = 'none';

        // General Stats
        document.getElementById('stats-total-checkins').textContent = state.checkins.length;
        const firstCheckin = [...state.checkins].sort((a, b) => a.createdAt - b.createdAt)[0];
        document.getElementById('stats-first-checkin').textContent = firstCheckin.createdAt.toLocaleDateString('pt-BR');

        // Mood-Tag Correlation
        const moodTagCounts = { verde: {}, amarelo: {}, vermelho: {} };

        state.checkins.forEach(checkin => {
            if (checkin.tags.length > 0) {
                checkin.tags.forEach(tag => {
                    moodTagCounts[checkin.mood][tag] = (moodTagCounts[checkin.mood][tag] || 0) + 1;
                });
            }
        });

        const getMostCommonTag = (tagCountObject) => {
            const tags = Object.keys(tagCountObject);
            if (tags.length === 0) return 'Nenhuma tag registrada';
            return tags.reduce((a, b) => tagCountObject[a] > tagCountObject[b] ? a : b);
        };

        const moodStats = [
            { mood: 'verde', title: 'Quando você se sente Bem', icon: 'smile', color: 'green-500' },
            { mood: 'amarelo', title: 'Quando você está em Atenção', icon: 'meh', color: 'amber-400' },
            { mood: 'vermelho', title: 'Quando você se sente Mal', icon: 'frown', color: 'red-500' }
        ];

        const moodTagsContainer = document.getElementById('stats-mood-tags');
        moodTagsContainer.innerHTML = moodStats.map(stat => {
            const mostCommonTag = getMostCommonTag(moodTagCounts[stat.mood]);
            return `
                <div class="bg-bg-secondary p-4 rounded-lg border border-border-primary">
                    <div class="flex items-center gap-3 mb-3">
                        <i data-feather="${stat.icon}" class="w-6 h-6 text-${stat.color}"></i>
                        <h4 class="text-lg font-bold">${stat.title}</h4>
                    </div>
                    <p class="text-text-secondary">A tag mais associada a este humor é:</p>
                    <p class="text-2xl font-bold text-accent mt-1">${mostCommonTag}</p>
                </div>
            `;
        }).join('');

        feather.replace();
    };


    const renderCharts = (checkinsToRender) => {
        const pieCtx = document.getElementById('mood-pie-chart').getContext('2d');

        const rootStyles = getComputedStyle(document.documentElement);
        const chartTextColor = `rgb(${rootStyles.getPropertyValue('--chart-text-rgb')})`;
        const chartGridColor = rootStyles.getPropertyValue('--chart-grid-rgba');

        const moodToValue = (mood) => ({ verde: 3, amarelo: 2, vermelho: 1 }[mood]);

        // Pie Chart
        const moodCounts = checkinsToRender.reduce((acc, c) => {
            acc[c.mood] = (acc[c.mood] || 0) + 1;
            return acc;
        }, {});

        if (state.pieChart) state.pieChart.destroy();
        state.pieChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(moodCounts).map(getMoodName),
                datasets: [{
                    data: Object.values(moodCounts),
                    backgroundColor: Object.keys(moodCounts).map(mood => moodColors[mood]),
                }]
            },
            options: { 
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: { color: chartTextColor }
                    } 
                } 
            }
        });

        // Tag Cloud
        const tagCloudContainer = document.getElementById('tag-cloud-container');
        const tagCounts = {};
        checkinsToRender.forEach(checkin => {
            checkin.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
        
        if (sortedTags.length > 0) {
            const maxCount = tagCounts[sortedTags[0]];
            const minCount = tagCounts[sortedTags[sortedTags.length - 1]];

            // Function to map count to font size
            const getFontSize = (count) => {
                const minSize = 14; // min font size in px
                const maxSize = 32; // max font size in px
                if (maxCount === minCount) return (minSize + maxSize) / 2;
                // Scale font size linearly between min and max
                return minSize + (maxSize - minSize) * (count - minCount) / (maxCount - minCount);
            };

            const tagCloudHTML = sortedTags.map(tag => 
                `<span class="inline-block m-1 p-1 font-bold" style="font-size: ${getFontSize(tagCounts[tag])}px; color: rgb(var(--color-accent)); opacity: ${0.6 + (0.4 * (getFontSize(tagCounts[tag])-14)/(32-14))};">${tag}</span>`
            ).join('');

            tagCloudContainer.innerHTML = `
                <h3 class="text-xl font-bold mb-4 text-center">Tags Mais Usadas</h3>
                <div class="p-4 bg-bg-tertiary rounded-lg text-center">${tagCloudHTML}</div>
            `;
        } else {
            tagCloudContainer.innerHTML = ''; // Clear if no tags
        }
    };

    const renderResources = () => {
        const allList = document.getElementById('resources-list');
        const suggestedContainer = document.getElementById('suggested-resources');
        
        const createResourceCard = (resource) => `
            <a href="${resource.contentUrl}" target="_blank" class="block bg-bg-secondary p-4 rounded-lg border border-border-primary hover:shadow-lg transition-shadow">
                <div class="flex items-center gap-3 mb-2">
                    <i data-feather="${resource.icon}" class="w-5 h-5 text-accent"></i>
                    <h4 class="font-bold text-lg">${resource.title}</h4>
                </div>
                <p class="text-text-secondary text-sm">${resource.description}</p>
            </a>
        `;
        
        allList.innerHTML = mockResources.map(createResourceCard).join('');
        
        let suggestionHTML = '';
        const lastCheckin = state.checkins.length > 0 ? [...state.checkins].sort((a, b) => b.createdAt - a.createdAt)[0] : null;

        if (lastCheckin && (lastCheckin.mood === 'vermelho' || lastCheckin.mood === 'amarelo')) {
            // 1. Contextual suggestions based on tags
            const checkinTags = lastCheckin.tags;
            const contextualResources = mockResources.filter(r => 
                r.category === 'contextual' && checkinTags.some(tag => r.tags.includes(tag))
            );

            if (contextualResources.length > 0) {
                suggestionHTML += `
                    <div class="mb-8">
                        <h3 class="text-xl font-bold mb-4">Sugestões para seu Contexto</h3>
                        <div class="space-y-4">
                            ${contextualResources.map(createResourceCard).join('')}
                        </div>
                    </div>
                `;
            }

            // 2. General suggestions (Calm/Release)
            const calmResources = mockResources.filter(r => r.category === 'calm');
            const releaseResources = mockResources.filter(r => r.category === 'release');

            if (calmResources.length > 0) {
                suggestionHTML += `
                    <div class="mb-8">
                        <h3 class="text-xl font-bold mb-4">Para Acalmar a Mente</h3>
                        <div class="space-y-4">${calmResources.map(createResourceCard).join('')}</div>
                    </div>`;
            }
            if (releaseResources.length > 0) {
                suggestionHTML += `
                    <div>
                        <h3 class="text-xl font-bold mb-4">Para Extravasar o Emocional</h3>
                        <div class="space-y-4">${releaseResources.map(createResourceCard).join('')}</div>
                    </div>`;
            }
        }

        if (suggestionHTML) {
            suggestedContainer.innerHTML = suggestionHTML + '<hr class="my-8 border-border-primary">';
        } else {
            suggestedContainer.innerHTML = '';
        }
        
        feather.replace(); // Garante que os ícones dinâmicos sejam renderizados
    };
    
    const handleDeleteCheckin = (checkinId) => {
        if (confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
            state.checkins = state.checkins.filter(c => c.id !== checkinId);
            saveState();
            renderHistory();
        }
    };

  const updateThemeSelector = () => {
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            if (btn.dataset.theme === state.theme) {
                btn.classList.add('border-accent', 'text-accent');
                btn.classList.remove('border-border-primary');
            } else {
                btn.classList.remove('border-accent', 'text-accent');
                btn.classList.add('border-border-primary');
            }
        });
    };

    const showAchievementUnlockedModal = (achievement) => {
        if (state.isFocusMode) return;
        document.getElementById('unlocked-achievement-title').textContent = achievement.title;
        document.getElementById('unlocked-achievement-desc').textContent = achievement.description;
        const modal = document.getElementById('achievement-unlocked-modal');
        modal.classList.remove('hidden');
        const modalContent = document.getElementById('achievement-modal-content');
        modalContent.classList.add('modal-enter');
        triggerConfetti();
    };

    const updateStreaksAndAchievements = () => {
        const oldLongestStreak = state.streaks.longest;
        state.streaks = calculateStreaks(state.checkins);

        achievementsData.forEach(achievement => {
            if (achievement.requirement.type === 'streak' && !state.unlockedAchievements.includes(achievement.id)) {
                if (state.streaks.longest >= achievement.requirement.value) {
                    state.unlockedAchievements.push(achievement.id);
                    if (state.streaks.longest > oldLongestStreak) {
                        showAchievementUnlockedModal(achievement);
                    }
                }
            }
        });
    };

    const renderAchievements = () => {
        const list = document.getElementById('achievements-list');
        list.innerHTML = achievementsData.map((ach, index) => {
            const isUnlocked = state.unlockedAchievements.includes(ach.id);
            const unlockedClasses = 'bg-accent-bg-light border-accent text-accent-text-dark';
            const lockedClasses = 'bg-bg-tertiary border-border-primary text-text-muted opacity-60';
            return `
                <div class="list-item-enter p-4 rounded-lg border-2 ${isUnlocked ? unlockedClasses : lockedClasses} flex flex-col items-center text-center" style="animation-delay: ${index * 50}ms;">
                    <i data-feather="${ach.icon}" class="w-10 h-10 mb-3 ${isUnlocked ? 'text-accent' : ''}"></i>
                    <h4 class="font-bold">${ach.title}</h4>
                    <p class="text-xs">${ach.description}</p>
                </div>
            `;
        }).join('');
        feather.replace();
    };

    // --- EVENT LISTENERS ---
    document.getElementById('onboarding-next-btn').addEventListener('click', () => {
        playClickSound();
        if (state.onboardingStep < onboardingSteps.length - 1) {
            transitionOnboardingStep('next');
        } else {
            // Last step's button is "Começar"
            navigateTo('mandatory-contact-screen');
        }
    });

    document.getElementById('onboarding-prev-btn').addEventListener('click', () => {
        playClickSound();
        if (state.onboardingStep > 0) {
            transitionOnboardingStep('prev');
        }
    });

    const renderMandatoryContacts = () => {
        const listContainer = document.getElementById('mandatory-contacts-list');
        const continueBtn = document.getElementById('mandatory-contact-continue-btn');
        
        listContainer.innerHTML = state.favoriteContacts.map(contact => `
            <div class="bg-bg-tertiary p-3 rounded-lg flex justify-between items-center">
                <span class="font-semibold">${contact.name}</span>
                <button data-id="${contact.id}" class="remove-mandatory-contact-btn text-red-500 hover:text-red-600">
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>
        `).join('');
        feather.replace();

        if (state.favoriteContacts.length > 0) {
            continueBtn.disabled = false;
            continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            continueBtn.disabled = true;
            continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    };

    const validateContactForm = (nameInput, phoneInput, addButton) => {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const isValid = name.length > 0 && phone.length === 15;

        if (isValid) {
            addButton.disabled = false;
            addButton.classList.remove('opacity-50', 'cursor-not-allowed');
            if (addButton.id === 'add-mandatory-contact-btn') {
                addButton.classList.add('hover:opacity-80');
            } else {
                addButton.classList.add('hover:bg-accent-hover');
            }
        } else {
            addButton.disabled = true;
            addButton.classList.add('opacity-50', 'cursor-not-allowed');
        }
    };

    document.getElementById('add-mandatory-contact-btn').addEventListener('click', () => {
        playClickSound();
        const nameInput = document.getElementById('mandatory-contact-name-input');
        const phoneInput = document.getElementById('mandatory-contact-phone-input');
        const errorDiv = document.getElementById('mandatory-contact-error');
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        // Clear previous error
        errorDiv.textContent = '';

        if (name && phone) {
            if (phone.length < 15) {
                errorDiv.textContent = 'Por favor, insira um número de telefone completo.';
                return;
            }
            state.favoriteContacts.push({ id: Date.now(), name, phone });
            renderMandatoryContacts();
            nameInput.value = '';
            phoneInput.value = '';
            validateContactForm(nameInput, phoneInput, document.getElementById('add-mandatory-contact-btn'));
        } else {
            errorDiv.textContent = 'Nome e telefone são obrigatórios.';
        }
    });

    document.getElementById('mandatory-contacts-list').addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-mandatory-contact-btn');
        playClickSound();
        if (removeBtn) {
            const contactId = removeBtn.dataset.id;
            state.favoriteContacts = state.favoriteContacts.filter(c => c.id.toString() !== contactId);
            renderMandatoryContacts();
        }
    });

    // Add input listeners for mandatory contact form validation
    ['mandatory-contact-name-input', 'mandatory-contact-phone-input'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const nameInput = document.getElementById('mandatory-contact-name-input');
            const phoneInput = document.getElementById('mandatory-contact-phone-input');
            const addBtn = document.getElementById('add-mandatory-contact-btn');
            const errorDiv = document.getElementById('mandatory-contact-error');
            errorDiv.textContent = ''; // Clear error on input
            validateContactForm(nameInput, phoneInput, addBtn);
        });
    });

    document.getElementById('mandatory-contact-continue-btn').addEventListener('click', () => {
        playClickSound();
        if (state.favoriteContacts.length > 0) {
            finishOnboarding();
        }
    });

    document.getElementById('skip-mandatory-contact-btn').addEventListener('click', () => {
        playClickSound();
        finishOnboarding();
        header.style.display = 'block';
        bottomNav.style.display = 'flex';
        navSpacer.style.display = 'block';
        navigateTo('checkin-screen');
    });

    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            playClickSound();
            state.currentMood = e.currentTarget.dataset.mood;
            const moodButtonColors = {
                verde: 'bg-green-500 hover:bg-green-600',
                amarelo: 'bg-amber-400 hover:bg-amber-500',
                vermelho: 'bg-red-500 hover:bg-red-600'
            };
            const moodColorClass = moodButtonColors[state.currentMood] || 'bg-gray-500 hover:bg-gray-600';
            document.getElementById('save-checkin-btn').className = `w-full text-accent-text font-bold py-4 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 ${moodColorClass}`;
            navigateTo('details-screen');

            // Avança o tour se estiver no passo de escolher o humor
            if (state.tourStep === 1) {
                nextTourStep();
            }
        });
    });
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            playClickSound();
            const screenId = e.currentTarget.dataset.screen;
            navigateTo(screenId);

            // Finaliza o tour se o usuário clicar no último passo
            if (state.tourStep === 3 && screenId === 'journey-screen') {
                endTour();
            }
        });
    });

    document.getElementById('predefined-tags-container').addEventListener('click', (e) => {
        const target = e.target.closest('.predefined-tag-btn');
        if (!target) return;
        playClickSound();

        const tag = target.dataset.tag;
        if (state.currentTags.includes(tag)) {
            state.currentTags = state.currentTags.filter(t => t !== tag);
        } else {
            state.currentTags.push(tag);
        }
        renderPredefinedTags('predefined-tags-container', state.currentTags);
    });

    document.getElementById('details-form').addEventListener('submit', (e) => {
        e.preventDefault();
        playClickSound();
        const newCheckin = {
            id: Date.now().toString(),
            mood: state.currentMood,
            notes: document.getElementById('notes').value,
            tags: [...state.currentTags],
            createdAt: new Date(),
        };
        state.checkins.push(newCheckin);
        updateStreaksAndAchievements();
        vibrate(100); // Vibrate on successful save
        saveState();

        // Reset form state
        document.getElementById('notes').value = '';
        state.currentTags = [];

        // Render and navigate to feedback screen
        renderFeedbackScreen(state.currentMood);
        navigateTo('feedback-screen');

        // Avança o tour se estiver no passo de adicionar detalhes
        if (state.tourStep === 2) {
            nextTourStep();
        }
    });

    document.getElementById('feedback-continue-btn').addEventListener('click', () => {
        playClickSound();
        const lastCheckin = state.checkins.length > 0 ? [...state.checkins].sort((a, b) => b.createdAt - a.createdAt)[0] : null;
        if (lastCheckin && (lastCheckin.mood === 'amarelo' || lastCheckin.mood === 'vermelho')) {
            renderContextualTips();
            navigateTo('contextual-tips-screen');
        } else {
            navigateTo('checkin-screen');
        }
    });

    document.getElementById('app-container').addEventListener('click', (e) => {
        const goToBtn = e.target.closest('.go-to-checkin-btn');
        if (goToBtn) playClickSound();
        if (goToBtn) {
            navigateTo('checkin-screen');
        }
    });

    document.getElementById('app-container').addEventListener('click', (e) => {
        const journeyLink = e.target.closest('.journey-link');
        if (journeyLink) playClickSound();
        if (journeyLink) {
            const screenId = journeyLink.dataset.screen;
            navigateTo(screenId);
        }

        const chatBtn = e.target.closest('[data-action="start-immediate-chat"]');
        if (chatBtn) {
            startImmediateChat();
        }
    });

    document.getElementById('add-resources-contact-btn').addEventListener('click', () => {
        playClickSound();
        const nameInput = document.getElementById('resources-contact-name-input');
        const phoneInput = document.getElementById('resources-contact-phone-input');
        const errorDiv = document.getElementById('resources-contact-error');
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        // Clear previous error
        errorDiv.textContent = '';

        if (name && phone) {
            if (phone.length < 15) {
                errorDiv.textContent = 'Por favor, insira um número de telefone completo.';
                return;
            }
            state.favoriteContacts.push({ id: Date.now(), name, phone });
            renderEmergencyContacts();
            nameInput.value = '';
            phoneInput.value = '';
        } else {
            errorDiv.textContent = 'Nome e telefone são obrigatórios.';
        }
    });

    // Add input listeners for resources contact form validation
    ['resources-contact-name-input', 'resources-contact-phone-input'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const nameInput = document.getElementById('resources-contact-name-input');
            const phoneInput = document.getElementById('resources-contact-phone-input');
            const addBtn = document.getElementById('add-resources-contact-btn');
            const errorDiv = document.getElementById('resources-contact-error');
            errorDiv.textContent = ''; // Clear error on input
            validateContactForm(nameInput, phoneInput, addBtn);
        });
    });

    document.getElementById('emergency-help-section').addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-resources-contact-btn');
        if (removeBtn) playClickSound();
        if (removeBtn) {
            const contactId = removeBtn.dataset.id;
            state.favoriteContacts = state.favoriteContacts.filter(c => c.id.toString() !== contactId);
            renderEmergencyContacts();
        }
    });

    document.getElementById('history-filter-container').addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.history-filter-btn');
        if (filterBtn) playClickSound();
        if (filterBtn) {
            const tag = filterBtn.dataset.tag;
            state.historyFilterTag = tag === 'all' ? null : tag;
            state.selectedDate = null; // Reset day selection
            renderHistory();
        }
    });

    document.getElementById('zen-mode-toggle').addEventListener('click', () => {
        playClickSound();
        state.isZenMode = !state.isZenMode;
        renderHistory();
    });

    document.getElementById('prev-month-btn').addEventListener('click', () => {
        playClickSound();
        state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
        state.selectedDate = null;
        state.historyFilterTag = null;
        renderHistory();
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
        playClickSound();
        state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
        state.selectedDate = null;
        state.historyFilterTag = null;
        renderHistory();
    });

    document.getElementById('calendar-grid').addEventListener('click', (e) => {
        const dayBtn = e.target.closest('.calendar-day');
        if (!dayBtn || !dayBtn.dataset.date) return;
        playClickSound();

        const clickedDate = new Date(dayBtn.dataset.date);

        state.selectedDate = (state.selectedDate && state.selectedDate.getTime() === clickedDate.getTime()) ? null : clickedDate;
        state.historyFilterTag = null;
        renderHistory();
    });

    document.getElementById('history-list').addEventListener('click', (e) => {
        const targetButton = e.target.closest('button[data-action]');
        if (targetButton) playClickSound();
        if (!targetButton) return;

        const action = targetButton.dataset.action;
        const checkinId = targetButton.dataset.id;

        if (action === 'edit') {
            openEditModal(checkinId);
        } else if (action === 'delete') {
            handleDeleteCheckin(checkinId);
        }
    });

    document.getElementById('tips-continue-btn').addEventListener('click', () => {
        playClickSound();
        navigateTo('checkin-screen');
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);

    document.getElementById('edit-predefined-tags-container').addEventListener('click', (e) => {
        const target = e.target.closest('.predefined-tag-btn');
        if (!target) return;
        playClickSound();

        const tag = target.dataset.tag;
        if (state.editingTags.includes(tag)) {
            state.editingTags = state.editingTags.filter(t => t !== tag);
        } else {
            state.editingTags.push(tag);
        }
        renderPredefinedTags('edit-predefined-tags-container', state.editingTags);
    });
    document.getElementById('edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        playClickSound();
        const checkinIndex = state.checkins.findIndex(c => c.id === state.editingCheckinId);
        if (checkinIndex === -1) return;
        state.checkins[checkinIndex].notes = document.getElementById('edit-notes').value;
        state.checkins[checkinIndex].tags = [...state.editingTags];
        saveState();
        renderHistory();
        closeEditModal();
    });

    document.getElementById('close-achievement-modal-btn').addEventListener('click', () => {
        playClickSound();
        const modal = document.getElementById('achievement-unlocked-modal');
        const modalContent = document.getElementById('achievement-modal-content');
        modalContent.classList.add('modal-leave');
        modalContent.addEventListener('animationend', () => modal.classList.add('hidden'), { once: true });
    });

    document.getElementById('add-new-goal-btn').addEventListener('click', () => {
        playClickSound();
        const input = document.getElementById('new-goal-input');
        const text = input.value.trim();
        if (text) {
            state.goals.push({ id: Date.now(), text, completed: false });
            saveState();
            renderGoals();
            input.value = '';
        }
    });

    document.getElementById('goals-list').addEventListener('click', (e) => {
        const checkbox = e.target.closest('.goal-checkbox');
        const removeBtn = e.target.closest('.remove-goal-btn');

        if (checkbox) {
            playClickSound();
            const goalId = checkbox.dataset.id;
            const goalIndex = state.goals.findIndex(g => g.id.toString() === goalId);
            if (goalIndex > -1) {
                const [goalToArchive] = state.goals.splice(goalIndex, 1);
                goalToArchive.completed = true;
                state.archivedGoals.unshift(goalToArchive); // Add to the top of archived
                vibrate();
                triggerConfetti();
                saveState();
                renderGoals();
            }
        }

        if (removeBtn) {
            playClickSound();
            const goalId = removeBtn.dataset.id;
            state.goals = state.goals.filter(g => g.id.toString() !== goalId);
            saveState();
            renderGoals();
        }
    });

    const renderGoals = () => {
        const activeList = document.getElementById('goals-list');
        const archivedContainer = document.getElementById('archived-goals-container');
        const toggleBtn = document.getElementById('toggle-archived-goals-btn');

        if (!activeList || !archivedContainer) return;

        if (state.goals.length === 0) {
            list.innerHTML = `<div class="text-center text-text-muted p-8">
                <i data-feather="target" class="w-12 h-12 mx-auto mb-4"></i>
                <p>Nenhuma meta definida ainda. Adicione uma acima!</p>
            </div>`;
            feather.replace();
            return;
        }

        // Render active goals
        activeList.innerHTML = state.goals.map((goal, index) => {
            return `
                <div class="goal-item list-item-enter bg-bg-secondary p-4 rounded-lg border border-border-primary flex items-center gap-4" data-id="${goal.id}" style="animation-delay: ${index * 60}ms;">
                    <i data-feather="grip-vertical" class="drag-handle text-text-muted cursor-move"></i>
                    <input type="checkbox" data-id="${goal.id}" class="goal-checkbox h-6 w-6 rounded text-accent focus:ring-accent border-border-primary">
                    <span class="flex-grow">${goal.text}</span>
                    <button data-id="${goal.id}" class="remove-goal-btn text-text-muted hover:text-red-500 p-1 rounded-md">
                        <i data-feather="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            `;
        }).join('');

        // Render archived goals
        if (state.archivedGoals.length > 0) {
            toggleBtn.style.display = 'flex';
            archivedContainer.innerHTML = state.archivedGoals.map((goal, index) => {
                return `
                <div class="goal-item list-item-enter bg-bg-secondary/50 p-4 rounded-lg border border-border-primary flex items-center gap-4 opacity-70" data-id="${goal.id}" style="animation-delay: ${index * 60}ms;">
                    <i data-feather="check-circle" class="text-green-500"></i>
                    <span class="flex-grow line-through text-text-muted">${goal.text}</span>
                    <button data-id="${goal.id}" class="restore-goal-btn text-text-muted hover:text-accent p-1 rounded-md" title="Restaurar Meta">
                        <i data-feather="rotate-ccw" class="w-5 h-5"></i>
                    </button>
                    <button data-id="${goal.id}" class="remove-goal-btn text-text-muted hover:text-red-500 p-1 rounded-md">
                        <i data-feather="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            `;
        }).join('');
        feather.replace();
        } else {
            toggleBtn.style.display = 'none';
            archivedContainer.innerHTML = '';
        }
    };

    const renderGratitudeJournal = () => {
        const list = document.getElementById('gratitude-entries-list');
        if (!list) return;

        if (state.gratitudeEntries.length === 0) {
            list.innerHTML = `<div class="text-center text-text-muted p-8">
                <i data-feather="sun" class="w-12 h-12 mx-auto mb-4"></i>
                <p>Nenhum registro de gratidão ainda. Adicione um para começar!</p>
            </div>`;
            feather.replace();
            return;
        }

        const sortedEntries = [...state.gratitudeEntries].sort((a, b) => b.createdAt - a.createdAt);

        list.innerHTML = sortedEntries.map((entry, index) => `
            <div class="list-item-enter bg-bg-secondary p-4 rounded-lg border border-border-primary flex flex-col" style="animation-delay: ${index * 60}ms;">
                <p class="text-text-primary flex-grow">${entry.text}</p>
                <div class="flex justify-between items-center mt-3">
                    <p class="text-xs text-text-muted">${new Date(entry.createdAt).toLocaleDateString('pt-BR')}</p>
                    <div class="flex gap-2">
                        <button data-action="edit" data-id="${entry.id}" class="gratitude-edit-btn text-text-muted hover:text-accent p-1 rounded-md transition-transform active:scale-90"><i data-feather="edit-2" class="w-4 h-4"></i></button>
                        <button data-action="delete" data-id="${entry.id}" class="gratitude-delete-btn text-text-muted hover:text-red-500 p-1 rounded-md transition-transform active:scale-90"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
        feather.replace();
    };

    const renderQuoteOfTheDay = () => {
        const quoteTextEl = document.getElementById('quote-text');
        const quoteAuthorEl = document.getElementById('quote-author');

        if (!quoteTextEl || !quoteAuthorEl) return;

        const randomIndex = Math.floor(Math.random() * state.motivationalQuotes.length);
        const { quote, author } = state.motivationalQuotes[randomIndex];

        quoteTextEl.textContent = `“${quote}”`;
        quoteAuthorEl.textContent = `— ${author || 'Autor Desconhecido'}`;
    };

    document.getElementById('add-new-gratitude-entry-btn').addEventListener('click', () => {
        playClickSound();
        const input = document.getElementById('new-gratitude-entry-input');
        const text = input.value.trim();
        if (text) {
            state.gratitudeEntries.push({ id: Date.now(), text, createdAt: new Date() });
            saveState();
            renderGratitudeJournal();
            input.value = '';
            vibrate();
            triggerConfetti();
        }
    });

    document.getElementById('toggle-add-quote-form-btn').addEventListener('click', () => {
        playClickSound();
        const formContainer = document.getElementById('add-quote-form-container');
        formContainer.classList.toggle('hidden');
    });

    document.getElementById('cancel-add-quote-btn').addEventListener('click', () => {
        playClickSound();
        const formContainer = document.getElementById('add-quote-form-container');
        formContainer.classList.add('hidden');
        document.getElementById('new-quote-text-input').value = '';
        document.getElementById('new-quote-author-input').value = '';
    });

    document.getElementById('save-new-quote-btn').addEventListener('click', () => {
        playClickSound();
        const textInput = document.getElementById('new-quote-text-input');
        const authorInput = document.getElementById('new-quote-author-input');
        const quoteText = textInput.value.trim();
        const authorText = authorInput.value.trim() || 'Você';

        if (quoteText) {
            state.motivationalQuotes.push({ quote: quoteText, author: authorText, userAdded: true });
            saveState();
            
            // Hide and reset form
            document.getElementById('add-quote-form-container').classList.add('hidden');
            textInput.value = '';
            authorInput.value = '';

            alert('Sua frase foi adicionada com sucesso!');
        }
    });

    document.getElementById('gratitude-entries-list').addEventListener('click', (e) => {
        const editBtn = e.target.closest('.gratitude-edit-btn');
        const deleteBtn = e.target.closest('.gratitude-delete-btn');

        if (editBtn) {
            playClickSound();
            const entryId = editBtn.dataset.id;
            openGratitudeEditModal(entryId);
        }

        if (deleteBtn) {
            playClickSound();
            const entryId = deleteBtn.dataset.id;
            if (confirm('Tem certeza que deseja excluir esta entrada de gratidão?')) {
                state.gratitudeEntries = state.gratitudeEntries.filter(entry => entry.id.toString() !== entryId);
                saveState();
                renderGratitudeJournal();
            }
        }
    });

    const openGratitudeEditModal = (entryId) => {
        const entry = state.gratitudeEntries.find(e => e.id.toString() === entryId);
        if (!entry) return;

        state.editingGratitudeId = entryId;
        document.getElementById('edit-gratitude-text').value = entry.text;

        const modal = document.getElementById('gratitude-edit-modal');
        modal.classList.remove('hidden');
        modal.querySelector('#gratitude-edit-modal-content').classList.add('modal-enter');
    };

    const closeGratitudeEditModal = () => {
        const modal = document.getElementById('gratitude-edit-modal');
        const modalContent = modal.querySelector('#gratitude-edit-modal-content');
        
        modalContent.classList.remove('modal-enter');
        modalContent.classList.add('modal-leave');
        modalContent.addEventListener('animationend', () => {
            modal.classList.add('hidden');
            state.editingGratitudeId = null;
        }, { once: true });
    };

    document.getElementById('gratitude-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        playClickSound();
        const newText = document.getElementById('edit-gratitude-text').value.trim();
        const entryIndex = state.gratitudeEntries.findIndex(entry => entry.id.toString() === state.editingGratitudeId);

        if (entryIndex !== -1 && newText) {
            state.gratitudeEntries[entryIndex].text = newText;
            saveState();
            renderGratitudeJournal();
        }
        closeGratitudeEditModal();
    });

    document.getElementById('cancel-gratitude-edit-btn').addEventListener('click', () => {
        closeGratitudeEditModal();
    });

    document.getElementById('theme-selector').addEventListener('click', (e) => {
        const themeBtn = e.target.closest('.theme-btn');
        if (themeBtn) playClickSound();
        if (themeBtn) {
            state.theme = themeBtn.dataset.theme;
            applyTheme(state.theme);
            saveState();
            if (['history-screen', 'diagnosis-screen', 'stats-screen'].includes(state.currentScreen)) {
                navigateTo(state.currentScreen); // Re-render to update charts
            }
        }
    });

    document.getElementById('focus-mode-toggle').addEventListener('click', () => {
        playClickSound();
        state.isFocusMode = !state.isFocusMode;
        saveState();
        renderFocusModeToggle();
    });

    document.getElementById('reminder-toggle').addEventListener('click', () => {
        playClickSound();
        const isEnabled = !state.reminderEnabled;
        if (isEnabled) {
            requestNotificationPermission();
        } else {
            state.reminderEnabled = false;
            renderReminderSettings();
            scheduleNextNotification(); // This will clear any pending notification
        }
    });

    document.getElementById('reminder-time-input').addEventListener('change', (e) => {
        state.reminderTime = e.target.value;
        scheduleNextNotification();
    });

    document.getElementById('settings-screen').addEventListener('click', (e) => {
        if (e.target.closest('#export-data-btn')) {
            playClickSound();
            exportDataAsJSON();
        }
        if (e.target.closest('#import-data-btn')) {
            playClickSound();
            // Trigger the hidden file input
            document.getElementById('import-file-input').click();
        }
        if (e.target.closest('#go-to-qr-screen-btn')) {
            playClickSound();
            navigateTo('qr-code-screen');
        }

    });

    document.getElementById('add-new-tag-btn').addEventListener('click', () => {
        const input = document.getElementById('new-tag-input');
        playClickSound();
        const newTag = input.value.trim();
        if (newTag && !state.predefinedTags.find(t => t.name.toLowerCase() === newTag.toLowerCase())) {
            state.predefinedTags.push({ name: newTag, icon: 'tag', color: getRandomColor() });
            saveState();
            renderTagManagement();
            input.value = '';
        }
    });

    document.getElementById('settings-screen').addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-managed-tag-btn');
        const changeIconBtn = e.target.closest('.change-tag-icon-btn');
        const colorPicker = e.target.closest('.tag-color-picker');

        if (removeBtn) playClickSound();
        if (removeBtn) {
            const tagToRemove = removeBtn.dataset.tag;
            state.predefinedTags = state.predefinedTags.filter(t => t !== tagToRemove);
            saveState();
            renderTagManagement();
        }

        if (changeIconBtn) {
            playClickSound();
            openIconPickerModal(changeIconBtn.dataset.tagName);
        }

        if (colorPicker) {
            // The 'input' event is used for live updates
            colorPicker.addEventListener('input', (event) => {
                const tagName = event.target.dataset.tagName;
                const newColor = event.target.value;
                const tagToUpdate = state.predefinedTags.find(t => t.name === tagName);
                if (tagToUpdate) tagToUpdate.color = newColor;
                saveState();
            }, { once: true }); // Use once to avoid adding multiple listeners
        }
    });

    const renderFocusModeToggle = () => {
        const toggle = document.getElementById('focus-mode-toggle');
        toggle.setAttribute('aria-checked', state.isFocusMode);
    };

    // --- NOTIFICATION LOGIC ---
    const renderReminderSettings = () => {
        const toggle = document.getElementById('reminder-toggle');
        const timeContainer = document.getElementById('reminder-time-container');
        const timeInput = document.getElementById('reminder-time-input');

        toggle.setAttribute('aria-checked', state.reminderEnabled);
        timeInput.value = state.reminderTime;

        if (state.reminderEnabled) {
            timeContainer.style.display = 'block';
        } else {
            timeContainer.style.display = 'none';
        }
    };

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            alert('Este navegador não suporta notificações.');
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            state.reminderEnabled = true;
            scheduleNextNotification();
        } else {
            state.reminderEnabled = false;
        }
        renderReminderSettings();
    };

    const scheduleNextNotification = () => {
        // Clear any previously scheduled notification
        if (state.nextNotificationTimeoutId) {
            clearTimeout(state.nextNotificationTimeoutId);
        }

        if (!state.reminderEnabled || Notification.permission !== 'granted') {
            return;
        }

        const [hours, minutes] = state.reminderTime.split(':').map(Number);
        const now = new Date();
        let notificationTime = new Date();
        notificationTime.setHours(hours, minutes, 0, 0);

        // If the time has already passed for today, schedule it for tomorrow
        if (now > notificationTime) {
            notificationTime.setDate(notificationTime.getDate() + 1);
        }

        const timeToNotification = notificationTime.getTime() - now.getTime();

        state.nextNotificationTimeoutId = setTimeout(() => {
            new Notification('Sinais de Emoções', {
                body: 'Como você está se sentindo agora? Tire um momento para registrar sua emoção.',
                icon: './favicon.ico' // Optional: Add an icon
            });
            scheduleNextNotification(); // Reschedule for the next day
        }, timeToNotification);
    };

    const exportDataAsJSON = () => {
        // Gather only the persistent and relevant user data
        const dataToExport = {
            checkins: state.checkins,
            goals: state.goals,
            gratitudeEntries: state.gratitudeEntries,
            favoriteContacts: state.favoriteContacts,
            predefinedTags: state.predefinedTags,
            motivationalQuotes: state.motivationalQuotes,
            unlockedAchievements: state.unlockedAchievements,
            streaks: state.streaks,
            settings: {
                theme: state.theme,
                isFocusMode: state.isFocusMode,
            }
        };

        const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sinais_de_emocoes_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    };

            const importDataFromJSON = (file) => {
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);

                        // Basic validation
                        if (!importedData.checkins || !Array.isArray(importedData.checkins)) {
                            throw new Error("Arquivo JSON inválido ou corrompido.");
                        }

                        if (!confirm('Atenção: Importar este arquivo irá sobrescrever todos os seus dados atuais. Deseja continuar?')) {
                            return;
                        }

                        // Restore state from imported data
                        state.checkins = importedData.checkins.map(c => ({ ...c, createdAt: new Date(c.createdAt) }));
                        state.goals = importedData.goals || [];
                        state.gratitudeEntries = (importedData.gratitudeEntries || []).map(e => ({ ...e, createdAt: new Date(e.createdAt) }));
                        state.favoriteContacts = importedData.favoriteContacts || [];
                        state.predefinedTags = importedData.predefinedTags || ["Trabalho", "Família", "Relacionamentos", "Saúde", "Lazer", "Estudos", "Finanças", "Pessoal"];
                        state.motivationalQuotes = importedData.motivationalQuotes || state.motivationalQuotes; // Keep default if not present
                        state.unlockedAchievements = importedData.unlockedAchievements || [];
                        state.streaks = importedData.streaks || { current: 0, longest: 0 };
                        if (importedData.settings) {
                            state.theme = importedData.settings.theme || 'auto';
                            state.isFocusMode = importedData.settings.isFocusMode || false;
                        }

                        saveState();
                        alert('Dados importados com sucesso!');
                        initializeApp(); // Re-initialize the app to reflect the new state

                    } catch (error) {
                        alert(`Erro ao importar o arquivo: ${error.message}`);
                    } finally {
                        // Reset file input to allow importing the same file again
                        document.getElementById('import-file-input').value = '';
                    }
                };
                reader.readAsText(file);
            };

    // --- TOUR LOGIC ---
    const finishOnboarding = () => {
        state.isAuthenticated = true;
        header.style.display = 'block';
        bottomNav.style.display = 'flex';
        navSpacer.style.display = 'block';
        navigateTo('checkin-screen');
        startTour();
    };

    const startTour = () => {
        state.tourStep = 0;
        document.getElementById('tour-overlay').style.display = 'block';
        showTourStep(state.tourStep);
    };

    const endTour = () => {
        state.tourStep = -1;
        // Clean up any active elements from the tour
        const activeElement = document.querySelector('.tour-active-element');
        if (activeElement) {
            activeElement.classList.remove('tour-active-element');
        }
        document.getElementById('tour-overlay').style.display = 'none';
    };

    const showTourStep = async (stepIndex) => {
        if (stepIndex < 0 || stepIndex >= tourSteps.length) {
            endTour();
            // After tour, navigate back to the main screen
            navigateTo('checkin-screen');
            return;
        }

        const step = tourSteps[stepIndex];
        
        if (step.action) {
            await step.action();
            // Give the UI a moment to update after navigation
            await new Promise(resolve => setTimeout(resolve, 300));
        }

                // Clean up previous step's active element
                const previousActive = document.querySelector('.tour-active-element');
                if (previousActive) {
                    previousActive.classList.remove('tour-active-element');
                }

        const targetElement = document.querySelector(step.element);
        if (!targetElement) {
            console.warn('Tour element not found:', step.element);
            endTour();
            return;
                }

                if (step.interactive) {
                    targetElement.classList.add('tour-active-element');
        }

        const rect = targetElement.getBoundingClientRect();
        const spotlight = document.getElementById('tour-spotlight');
        const tooltip = document.getElementById('tour-tooltip');

        // Update spotlight
        spotlight.style.top = `${rect.top - 8}px`;
        spotlight.style.left = `${rect.left - 8}px`;
        spotlight.style.width = `${rect.width + 16}px`;
        spotlight.style.height = `${rect.height + 16}px`;

        // Update tooltip content
        document.getElementById('tour-title').textContent = step.title;
        document.getElementById('tour-text').textContent = step.text;
                document.getElementById('tour-step-indicator').textContent = `${stepIndex + 1} / ${tourSteps.length}`;
                document.getElementById('tour-progress-bar').style.width = `${((stepIndex + 1) / tourSteps.length) * 100}%`;

        const nextBtn = document.getElementById('tour-next-btn');
        nextBtn.textContent = (stepIndex === tourSteps.length - 1) ? 'Finalizar' : 'Próximo';
                nextBtn.style.display = step.interactive ? 'none' : 'block';

        // Position tooltip
        const tooltipRect = tooltip.getBoundingClientRect();
        let tooltipTop = rect.bottom + 15; // Default below
        let tooltipLeft = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        // Adjust if it goes off-screen
        if (tooltipTop + tooltipRect.height > window.innerHeight) {
            tooltipTop = rect.top - tooltipRect.height - 15; // Position above
        }
        if (tooltipLeft < 10) {
            tooltipLeft = 10;
        }
        if (tooltipLeft + tooltipRect.width > window.innerWidth - 10) {
            tooltipLeft = window.innerWidth - tooltipRect.width - 10;
        }

        tooltip.style.top = `${tooltipTop}px`;
        tooltip.style.left = `${tooltipLeft}px`;
                tooltip.classList.add('visible');
    };

    document.getElementById('tour-next-btn').addEventListener('click', () => {
        playClickSound();
        nextTourStep();
    });

    document.getElementById('tour-skip-btn').addEventListener('click', () => {
        playClickSound();
        endTour();
    });

    const openIconPickerModal = (tagName) => {
        state.editingTagForIcon = tagName;
        const grid = document.getElementById('icon-picker-grid');
        grid.innerHTML = availableIcons.map(icon => `
            <button class="icon-picker-btn p-3 rounded-lg hover:bg-bg-tertiary flex items-center justify-center" data-icon="${icon}">
                <i data-feather="${icon}" class="w-6 h-6"></i>
            </button>
        `).join('');
        feather.replace();
        document.getElementById('icon-picker-modal').classList.remove('hidden');
    };

    const closeIconPickerModal = () => {
        document.getElementById('icon-picker-modal').classList.add('hidden');
        state.editingTagForIcon = null;
    };

    document.getElementById('close-icon-picker-btn').addEventListener('click', () => {
        playClickSound();
        closeIconPickerModal();
    });

    document.getElementById('icon-picker-grid').addEventListener('click', (e) => {
        const iconBtn = e.target.closest('.icon-picker-btn');
        if (!iconBtn) return;

        playClickSound();
        const selectedIcon = iconBtn.dataset.icon;
        const tagToUpdate = state.predefinedTags.find(t => t.name === state.editingTagForIcon);

        if (tagToUpdate) {
            tagToUpdate.icon = selectedIcon;
            saveState();
            renderTagManagement();
            closeIconPickerModal();
        }
    });


            document.getElementById('import-file-input').addEventListener('change', (e) => {
                const file = e.target.files[0];
                importDataFromJSON(file);
            });

    const startAppFlow = () => {
        if (state.isAuthenticated) {
            header.style.display = 'block';
            bottomNav.style.display = 'flex';
            navSpacer.style.display = 'block';
            navigateTo('checkin-screen');
        } else {
            navigateTo('onboarding-screen');
        }
    };

    // --- APP INITIALIZATION ---
    const initializeApp = () => {
        applyTheme(state.theme);

        // Data migration: if tags are strings, convert them to objects
        if (state.predefinedTags.length > 0 && typeof state.predefinedTags[0] === 'string') {
            const defaultData = { "Trabalho": { icon: "briefcase", color: "#3B82F6" }, "Família": { icon: "users", color: "#10B981" }, "Relacionamentos": { icon: "heart", color: "#EF4444" }, "Saúde": { icon: "activity", color: "#14B8A6" }, "Lazer": { icon: "sun", color: "#F59E0B" }, "Estudos": { icon: "book-open", color: "#8B5CF6" }, "Finanças": { icon: "dollar-sign", color: "#22C55E" }, "Pessoal": { icon: "user", color: "#6366F1" } };
            state.predefinedTags = state.predefinedTags.map(tag => ({
                name: tag,
                icon: (defaultData[tag] && defaultData[tag].icon) || 'tag',
                color: (defaultData[tag] && defaultData[tag].color) || getRandomColor()
            }));
        }

        scheduleNextNotification(); // Check if a notification needs to be scheduled on app start
        startAppFlow();
        feather.replace(); // Initialize icons
    };

    // loadState(); // In presentation mode, we don't load previous state
    initializeApp();

    // --- DRAG & DROP INITIALIZATION ---
    const goalsListEl = document.getElementById('goals-list');
    state.goalsSortable = new Sortable(goalsListEl, {
        animation: 150,
        handle: '.drag-handle', // Use the grip icon as the drag handle
        ghostClass: 'sortable-ghost', // Class for the drop placeholder
        onEnd: (evt) => {
            const { oldIndex, newIndex } = evt;
            if (oldIndex === newIndex) return;

            // Reorder the state.goals array
            const [movedItem] = state.goals.splice(oldIndex, 1);
            state.goals.splice(newIndex, 0, movedItem);

            saveState();
            // No need to re-render, SortableJS handles the DOM update.
            // Re-rendering would cause a visual flash.
        },
    });

    document.getElementById('toggle-archived-goals-btn').addEventListener('click', (e) => {
        playClickSound();
        const container = document.getElementById('archived-goals-container');
        const chevron = document.getElementById('archived-goals-chevron');
        container.classList.toggle('hidden');
        chevron.classList.toggle('rotate-180');
    });

    document.getElementById('archived-goals-container').addEventListener('click', (e) => {
        const restoreBtn = e.target.closest('.restore-goal-btn');
        const removeBtn = e.target.closest('.remove-goal-btn');

        if (restoreBtn) {
            playClickSound();
            const goalId = restoreBtn.dataset.id;
            const goalIndex = state.archivedGoals.findIndex(g => g.id.toString() === goalId);
            if (goalIndex > -1) {
                const [goalToRestore] = state.archivedGoals.splice(goalIndex, 1);
                goalToRestore.completed = false;
                state.goals.push(goalToRestore);
                saveState();
                renderGoals();
            }
        } else if (removeBtn) {
            playClickSound();
            const goalId = removeBtn.dataset.id;
            state.archivedGoals = state.archivedGoals.filter(g => g.id.toString() !== goalId);
            saveState();
            renderGoals();
        }
    });

    const tagsListEl = document.getElementById('tag-management-list');
    state.tagsSortable = new Sortable(tagsListEl, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const { oldIndex, newIndex } = evt;
            if (oldIndex === newIndex) return;

            // Reorder the state.predefinedTags array
            const [movedItem] = state.predefinedTags.splice(oldIndex, 1);
            state.predefinedTags.splice(newIndex, 0, movedItem);

            saveState();
            // Re-render to update the order in other parts of the app if necessary, e.g., the details screen
        },
    });

    // --- IMMEDIATE CHAT LOGIC ---

    const showTypingIndicator = () => {
        const chatMessages = document.getElementById('chat-messages');
        // Evita adicionar múltiplos indicadores
        if (document.getElementById('typing-indicator')) return;

        const indicatorHTML = `
            <div id="typing-indicator" class="flex items-end gap-2 animate-fade-in">
                <div class="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-accent-text">
                    <i data-feather="smile" class="w-5 h-5"></i>
                </div>
                <div class="bg-bg-tertiary p-3 rounded-lg flex items-center space-x-1.5">
                    <div class="w-2 h-2 bg-text-muted rounded-full animate-bounce" style="animation-delay: -0.3s;"></div>
                    <div class="w-2 h-2 bg-text-muted rounded-full animate-bounce" style="animation-delay: -0.15s;"></div>
                    <div class="w-2 h-2 bg-text-muted rounded-full animate-bounce"></div>
                </div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', indicatorHTML);
        feather.replace();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const hideTypingIndicator = () => {
        document.getElementById('typing-indicator')?.remove();
    };

    const toggleMainUI = (show) => {
        header.style.display = show ? 'block' : 'none';
        bottomNav.style.display = show ? 'flex' : 'none';
        navSpacer.style.display = show ? 'block' : 'none';
    };

    const startImmediateChat = () => {
        playClickSound();
        navigateTo('immediate-chat-screen');
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = ''; // Clear previous chat
        addBotMessage("Olá! Eu sou o Zen, seu companheiro de apoio. Estou aqui para te ouvir sem julgamentos. Como você está se sentindo agora?");
    };

    const addBotMessage = (text) => {
        const chatMessages = document.getElementById('chat-messages');
        const messageHTML = `
            <div class="flex items-end gap-2 animate-fade-in">
                <div class="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-accent-text">
                    <i data-feather="smile" class="w-5 h-5"></i>
                </div>
                <div class="bg-bg-tertiary p-3 rounded-lg max-w-xs">
                    <p class="text-sm">${text}</p>
                </div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        feather.replace();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const addUserMessage = (text) => {
        const chatMessages = document.getElementById('chat-messages');
        const messageHTML = `
            <div class="flex items-end gap-2 justify-end animate-fade-in">
                <div class="bg-accent p-3 rounded-lg max-w-xs">
                    <p class="text-sm text-accent-text">${text}</p>
                </div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const getBotResponse = (userMessage) => {
        // Simple keyword-based responses for demonstration
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.includes("ansioso") || lowerMessage.includes("preocupado") || lowerMessage.includes("nervoso")) {
            return "Percebo que a ansiedade está presente. É uma sensação que pode ser muito intensa. Se você se sentir confortável, pode me contar o que está passando pela sua mente?";
        }
        if (lowerMessage.includes("triste") || lowerMessage.includes("sozinho") || lowerMessage.includes("pra baixo")) {
            return "Sinto muito que esteja se sentindo assim. A tristeza pode ser pesada. Lembre-se que este é um espaço seguro para você, e eu estou aqui para te ouvir.";
        }
        if (lowerMessage.includes("obrigado") || lowerMessage.includes("ajudou")) {
            return "Fico feliz em poder ser um apoio para você. Lembre-se, minha programação é estar sempre aqui se precisar conversar. Cuide-se bem.";
        }
        if (lowerMessage.includes("quem é você") || lowerMessage.includes("você é um robô")) {
            return "Eu sou o Zen, uma inteligência artificial criada para ser um ouvinte empático. Não sou uma pessoa, mas fui programado para oferecer um espaço seguro e sem julgamentos para você se expressar.";
        }
        // Generic empathetic responses
        const responses = [
            "Entendi. Se quiser, pode me contar mais sobre isso.",
            "Isso parece ser algo importante para você. Agradeço por compartilhar.",
            "É preciso coragem para falar sobre nossos sentimentos. Estou aqui, ouvindo.",
            "E como você se sentiu com essa situação?",
            "Na sua opinião, o que poderia te ajudar a se sentir um pouco melhor neste momento?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    };

    document.getElementById('chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (message) {
            addUserMessage(message);
            input.value = '';
            showTypingIndicator();
            // Simulate bot thinking and responding
            setTimeout(() => {
                hideTypingIndicator();
                const botResponse = getBotResponse(message);
                addBotMessage(botResponse);
            }, 1500);
        }
    });

    document.getElementById('chat-back-btn').addEventListener('click', () => {
        playClickSound();
        toggleMainUI(true); // Show main header/nav again
        navigateTo('specialists-list-screen');
    });
});