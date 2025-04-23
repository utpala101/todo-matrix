// 全局变量
let tasks = {
    day: {
        'important-urgent': [],
        'important-not-urgent': [],
        'not-important-urgent': [],
        'not-important-not-urgent': []
    },
    week: {
        'important-urgent': [],
        'important-not-urgent': [],
        'not-important-urgent': [],
        'not-important-not-urgent': []
    },
    month: {
        'important-urgent': [],
        'important-not-urgent': [],
        'not-important-urgent': [],
        'not-important-not-urgent': []
    }
};

let currentTab = 'day';
let pendingTasks = []; // 等待AI判定的任务
let currentTask = null; // 当前处理的任务
let draggedItem = null; // 当前拖拽的任务项

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeTaskFunctions();
    initializeAPISettings();
    initializeDragAndDrop();
    loadTasksFromLocalStorage();
    renderAllTasks();
});

// 初始化标签切换
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有标签的活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // 隐藏所有内容
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // 激活当前标签和内容
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-content`).classList.add('active');
            
            // 更新当前标签
            currentTab = tabId;
        });
    });
}

// 初始化API设置
function initializeAPISettings() {
    // API设置按钮
    document.getElementById('api-settings-btn').addEventListener('click', () => {
        // 显示API设置模态框
        document.getElementById('api-settings-modal').style.display = 'block';
        
        // 填充现有的API设置（如果有）
        const apiKey = localStorage.getItem('aiApiKey') || '';
        const apiUrl = localStorage.getItem('aiApiUrl') || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
        const apiModel = localStorage.getItem('aiApiModel') || 'ep-20250326225223-p5jxh';
        
        document.getElementById('api-key').value = apiKey;
        document.getElementById('api-url').value = apiUrl;
        document.getElementById('api-model').value = apiModel;
    });
    
    // 关闭API设置模态框
    const closeButtons = document.querySelectorAll('#api-settings-modal .close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('api-settings-modal').style.display = 'none';
        });
    });
    
    // 点击模态框外部时关闭
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('api-settings-modal')) {
            document.getElementById('api-settings-modal').style.display = 'none';
        }
    });
    
    // 显示/隐藏密码切换
    document.getElementById('toggle-password').addEventListener('click', () => {
        const apiKeyInput = document.getElementById('api-key');
        const toggleBtn = document.getElementById('toggle-password');
        
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleBtn.textContent = '隐藏';
        } else {
            apiKeyInput.type = 'password';
            toggleBtn.textContent = '显示';
        }
    });
    
    // 保存API设置
    document.getElementById('save-api-key').addEventListener('click', () => {
        const apiKey = document.getElementById('api-key').value.trim();
        const apiUrl = document.getElementById('api-url').value.trim();
        const apiModel = document.getElementById('api-model').value.trim();
        
        // 保存到本地存储
        if (apiKey) {
            localStorage.setItem('aiApiKey', apiKey);
            localStorage.setItem('aiApiUrl', apiUrl || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions');
            localStorage.setItem('aiApiModel', apiModel || 'ep-20250326225223-p5jxh');
            alert('API设置已保存');
        } else {
            // 如果输入为空，则删除已存储的设置
            localStorage.removeItem('aiApiKey');
            localStorage.removeItem('aiApiUrl');
            localStorage.removeItem('aiApiModel');
            alert('API设置已清除，系统将使用本地模拟响应');
        }
        
        // 关闭模态框
        document.getElementById('api-settings-modal').style.display = 'none';
    });
}

// 初始化任务相关功能
function initializeTaskFunctions() {
    // 添加任务按钮
    document.getElementById('add-task-btn').addEventListener('click', addNewTask);
    
    // 监听回车键添加任务
    document.getElementById('task-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewTask();
        }
    });
    
    // AI分析按钮
    document.getElementById('ai-analyze-btn').addEventListener('click', showTaskQuestionnaire);
    
    // 提交问卷按钮
    document.getElementById('submit-questionnaire').addEventListener('click', submitQuestionnaire);
    
    // 返回问卷按钮
    document.getElementById('back-to-questionnaire').addEventListener('click', () => {
        document.getElementById('ai-analysis-result').style.display = 'none';
        document.getElementById('task-questionnaire').style.display = 'block';
    });
    
    // 应用AI结果按钮
    document.getElementById('ai-apply-btn').addEventListener('click', applyAIResults);
    
    // 关闭模态框
    document.querySelector('#ai-modal .close').addEventListener('click', () => {
        document.getElementById('ai-modal').style.display = 'none';
        // 重置模态框状态
        document.getElementById('task-questionnaire').style.display = 'block';
        document.getElementById('ai-analysis-result').style.display = 'none';
    });
    
    // 点击模态框外部时关闭
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('ai-modal')) {
            document.getElementById('ai-modal').style.display = 'none';
            // 重置模态框状态
            document.getElementById('task-questionnaire').style.display = 'block';
            document.getElementById('ai-analysis-result').style.display = 'none';
        }
    });
    
    // 初始化象限内添加任务功能
    initializeQuadrantAddForms();
}

// 初始化象限内添加任务表单
function initializeQuadrantAddForms() {
    // 为所有象限添加按钮绑定事件
    const addButtons = document.querySelectorAll('.quadrant-add-btn');
    
    addButtons.forEach(button => {
        // 点击添加按钮
        button.addEventListener('click', () => {
            const quadrant = button.getAttribute('data-quadrant');
            const timeFrame = button.getAttribute('data-timeframe');
            const inputField = button.parentElement.querySelector('.quadrant-input');
            
            addTaskToQuadrant(inputField.value.trim(), quadrant, timeFrame);
            inputField.value = ''; // 清空输入框
        });
        
        // 获取关联的输入框
        const inputField = button.parentElement.querySelector('.quadrant-input');
        
        // 监听回车键
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const quadrant = button.getAttribute('data-quadrant');
                const timeFrame = button.getAttribute('data-timeframe');
                
                addTaskToQuadrant(inputField.value.trim(), quadrant, timeFrame);
                inputField.value = ''; // 清空输入框
            }
        });
    });
}

// 直接添加任务到特定象限
function addTaskToQuadrant(taskText, quadrant, timeFrame) {
    if (!taskText) return; // 如果文本为空，则不添加
    
    // 创建新任务对象
    const newTask = {
        id: Date.now().toString(),
        text: taskText,
        completed: false
    };
    
    // 添加到任务列表
    tasks[timeFrame][quadrant].push(newTask);
    
    // 重新渲染该象限的任务
    renderTasksForQuadrant(timeFrame, quadrant);
    
    // 保存到本地存储
    saveTasksToLocalStorage();
}

// 添加新任务
function addNewTask() {
    const taskInput = document.getElementById('task-input');
    const taskText = taskInput.value.trim();
    
    if (taskText) {
        // 临时添加到待定任务列表
        pendingTasks.push({
            id: Date.now().toString(),
            text: taskText,
            completed: false,
            timeFrame: currentTab
        });
        
        // 清空输入框
        taskInput.value = '';
        
        // 自动弹出AI分析
        showTaskQuestionnaire();
    }
}

// 显示任务问卷
function showTaskQuestionnaire() {
    const taskInput = document.getElementById('task-input');
    const taskText = taskInput.value.trim();
    
    if (!taskText) {
        alert('请先输入任务内容');
        return;
    }
    
    // 保存当前任务
    currentTask = {
        id: Date.now().toString(),
        text: taskText,
        completed: false,
        timeFrame: currentTab
    };
    
    // 显示任务名称
    document.getElementById('task-name').textContent = taskText;
    
    // 重置问卷表单
    resetQuestionnaireForm();
    
    // 显示模态框
    document.getElementById('ai-modal').style.display = 'block';
    document.getElementById('task-questionnaire').style.display = 'block';
    document.getElementById('ai-analysis-result').style.display = 'none';
    
    // 清空输入框
    taskInput.value = '';
}

// 重置问卷表单
function resetQuestionnaireForm() {
    // 重置单选框为默认值
    document.querySelector('input[name="task-type"][value="work"]').checked = true;
    document.querySelector('input[name="self-value"][value="high"]').checked = true;
    document.querySelector('input[name="urgency"][value="medium"]').checked = true;
    
    // 设置默认截止日期为一周后
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dateString = nextWeek.toISOString().split('T')[0]; // 格式：YYYY-MM-DD
    document.getElementById('deadline').value = dateString;
    
    // 清空备注
    document.getElementById('additional-notes').value = '';
}

// 提交问卷进行AI分析
function submitQuestionnaire() {
    // 收集问卷数据
    const taskType = document.querySelector('input[name="task-type"]:checked').value;
    const selfValue = document.querySelector('input[name="self-value"]:checked').value;
    const urgency = document.querySelector('input[name="urgency"]:checked').value;
    const deadline = document.getElementById('deadline').value;
    const additionalNotes = document.getElementById('additional-notes').value.trim();
    
    // 计算截止日期与今天的天数差
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = Math.abs(deadlineDate.getTime() - today.getTime());
    const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // 将当前任务添加到待处理任务列表
    pendingTasks = [currentTask];
    
    // 分析任务
    analyzeTasksWithAI({
        taskData: {
            taskType,
            selfValue,
            urgency,
            daysUntilDeadline,
            additionalNotes
        }
    });
}

// 使用AI分析任务
function analyzeTasksWithAI(questionnaireData = null) {
    if (pendingTasks.length === 0) {
        alert('没有待分析的任务');
        return;
    }

    // 显示AI分析结果区域，隐藏问卷
    document.getElementById('task-questionnaire').style.display = 'none';
    document.getElementById('ai-analysis-result').style.display = 'block';
    document.getElementById('ai-result-content').innerHTML = '<p>正在分析中...</p>';
    
    // 收集已存在的任务作为上下文
    let existingTasks = [];
    for (const timeFrame in tasks) {
        for (const quadrant in tasks[timeFrame]) {
            tasks[timeFrame][quadrant].forEach(task => {
                existingTasks.push({
                    text: task.text,
                    quadrant: quadrant,
                    timeFrame: timeFrame
                });
            });
        }
    }
    
    // 构建请求数据
    const requestData = {
        existingTasks: existingTasks,
        pendingTasks: pendingTasks.map(task => ({
            id: task.id,
            text: task.text,
            timeFrame: task.timeFrame
        })),
        questionnaireData: questionnaireData
    };
    
    // 调用真实API进行分析
    realAIAnalysis(requestData);
}

// 使用真实AI API进行分析
function realAIAnalysis(requestData) {
    // 构建提示词
    const existingTasksDesc = requestData.existingTasks.length > 0 
        ? "已有任务列表：\n" + requestData.existingTasks.map(t => 
            `- ${t.text}（${t.timeFrame}，${translateQuadrant(t.quadrant)}）`).join("\n")
        : "目前没有已分类的任务";
    
    const pendingTasksDesc = requestData.pendingTasks.map(t => 
        `- ID: ${t.id}, 内容: ${t.text}, 时间框架: ${t.timeFrame}`).join("\n");
    
    // 添加问卷数据到提示词
    let questionnaireInfo = "";
    if (requestData.questionnaireData) {
        const qData = requestData.questionnaireData.taskData;
        
        // 翻译问卷选项为中文描述
        const taskTypeMap = {
            'work': '工作任务',
            'self-improvement': '自我提升',
            'personal': '个人事务',
            'other': '其他类型'
        };
        
        const selfValueMap = {
            'high': '高价值',
            'medium': '中等价值',
            'low': '低价值'
        };
        
        const urgencyMap = {
            'high': '非常紧急',
            'medium': '中等紧急',
            'low': '不紧急'
        };
        
        questionnaireInfo = `
用户对任务的额外描述：
- 任务类型: ${taskTypeMap[qData.taskType]}
- 对个人的价值: ${selfValueMap[qData.selfValue]}
- 紧急程度: ${urgencyMap[qData.urgency]}
- 距离截止日期: ${qData.daysUntilDeadline}天
${qData.additionalNotes ? `- 附加说明: ${qData.additionalNotes}` : ''}
`;
    }
    
    const prompt = `
我需要你帮我分析一些工作任务，并将它们分配到艾森豪威尔矩阵的四个象限中：
1. 重要且紧急 (important-urgent)
2. 重要不紧急 (important-not-urgent)
3. 紧急不重要 (not-important-urgent)
4. 不重要不紧急 (not-important-not-urgent)

${existingTasksDesc}

需要分类的新任务：
${pendingTasksDesc}

${questionnaireInfo}

请以JSON格式返回分析结果，格式如下：
{
  "results": [
    {
      "id": "任务ID",
      "quadrant": "象限标识（如important-urgent）",
      "reasoning": "分配到此象限的理由，请详细解释为什么这个任务被分配到这个象限，考虑重要性和紧急性两个维度"
    }
  ]
}
请只返回JSON格式，不要有其他文字。
`;

    // 从本地存储获取API设置
    const apiKey = localStorage.getItem('aiApiKey');
    const apiUrl = localStorage.getItem('aiApiUrl') || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const apiModel = localStorage.getItem('aiApiModel') || 'ep-20250326225223-p5jxh';
    
    if (!apiKey) {
        // 如果没有API密钥，回退到模拟响应
        console.warn('未找到API密钥，使用模拟响应');
        simulateAIResponse(requestData);
        return;
    }
    
    // 调用API
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            "model": apiModel,
            "messages": [
                {"role": "system", "content": "你是一个专业的任务分析助手，擅长根据艾森豪威尔矩阵分析任务的重要性和紧急性。"},
                {"role": "user", "content": prompt}
            ]
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('API响应错误: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        try {
            // 提取API返回的内容
            const content = data.choices[0].message.content;
            
            // 尝试解析JSON
            let jsonResponse;
            try {
                // 如果返回的是纯JSON
                jsonResponse = JSON.parse(content);
            } catch (e) {
                // 如果JSON被包含在其他文本中，尝试提取
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonResponse = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('无法解析API返回的JSON');
                }
            }
            
            // 显示分析结果
            if (jsonResponse && jsonResponse.results) {
                displayAIResults(jsonResponse.results);
            } else {
                throw new Error('API返回格式不正确');
            }
        } catch (error) {
            console.error('解析API响应失败:', error);
            document.getElementById('ai-result-content').innerHTML = 
                '<p class="error">API返回格式错误，请重试</p>';
            // 回退到模拟响应
            simulateAIResponse(requestData);
        }
    })
    .catch(error => {
        console.error('AI分析失败:', error);
        document.getElementById('ai-result-content').innerHTML = 
            `<p class="error">AI分析失败: ${error.message}。正在使用本地模拟...</p>`;
        // 如果API调用失败，回退到模拟响应
        simulateAIResponse(requestData);
    });
}

// 翻译象限ID为中文描述
function translateQuadrant(quadrant) {
    const translations = {
        'important-urgent': '重要且紧急',
        'important-not-urgent': '重要不紧急',
        'not-important-urgent': '紧急不重要',
        'not-important-not-urgent': '不重要不紧急'
    };
    return translations[quadrant] || quadrant;
}

// 模拟AI响应（实际项目中可替换为真实API调用）
function simulateAIResponse(requestData) {
    console.log('分析请求数据:', requestData);
    
    // 在真实项目中，这里会是一个API调用
    // 这里我们用模拟逻辑来替代
    
    setTimeout(() => {
        // 简单模拟AI逻辑
        const results = [];
        
        for (const task of requestData.pendingTasks) {
            // 初始化权重
            let importanceScore = 0.5; // 默认中等重要性
            let urgencyScore = 0.5;    // 默认中等紧急性
            
            // 如果有问卷数据，根据问卷调整评分
            if (requestData.questionnaireData) {
                const qData = requestData.questionnaireData.taskData;
                
                // 根据任务类型调整重要性
                if (qData.taskType === 'work') importanceScore += 0.1;
                if (qData.taskType === 'self-improvement') importanceScore += 0.2;
                
                // 根据自我价值调整重要性
                if (qData.selfValue === 'high') importanceScore += 0.3;
                if (qData.selfValue === 'medium') importanceScore += 0.1;
                if (qData.selfValue === 'low') importanceScore -= 0.1;
                
                // 根据紧急程度调整紧急性
                if (qData.urgency === 'high') urgencyScore += 0.3;
                if (qData.urgency === 'medium') urgencyScore += 0.1;
                if (qData.urgency === 'low') urgencyScore -= 0.2;
                
                // 根据截止日期调整紧急性
                if (qData.daysUntilDeadline <= 1) urgencyScore += 0.4;
                else if (qData.daysUntilDeadline <= 3) urgencyScore += 0.3;
                else if (qData.daysUntilDeadline <= 7) urgencyScore += 0.1;
                
                // 限制分数范围
                importanceScore = Math.max(0, Math.min(1, importanceScore));
                urgencyScore = Math.max(0, Math.min(1, urgencyScore));
            } else {
                // 示例: 根据文本中的关键词分配象限
                const text = task.text.toLowerCase();
                
                if (text.includes('紧急') || text.includes('立即') || text.includes('马上')) {
                    urgencyScore += 0.3;
                }
                
                if (text.includes('重要') || text.includes('关键') || text.includes('必须')) {
                    importanceScore += 0.3;
                }
                
                // 随机性
                urgencyScore += (Math.random() * 0.2 - 0.1);
                importanceScore += (Math.random() * 0.2 - 0.1);
            }
            
            // 根据评分确定象限
            let quadrant;
            if (importanceScore >= 0.5 && urgencyScore >= 0.5) {
                quadrant = 'important-urgent';
            } else if (importanceScore >= 0.5 && urgencyScore < 0.5) {
                quadrant = 'important-not-urgent';
            } else if (importanceScore < 0.5 && urgencyScore >= 0.5) {
                quadrant = 'not-important-urgent';
            } else {
                quadrant = 'not-important-not-urgent';
            }
            
            results.push({
                id: task.id,
                quadrant: quadrant,
                reasoning: generateReasoning(task.text, quadrant, importanceScore, urgencyScore)
            });
        }
        
        displayAIResults(results);
    }, 1500); // 模拟API调用延迟
}

// 生成分析原因（模拟）
function generateReasoning(text, quadrant, importanceScore, urgencyScore) {
    // 根据评分生成更个性化的理由
    const importanceLevel = importanceScore >= 0.7 ? "非常重要" : 
                            importanceScore >= 0.5 ? "比较重要" : 
                            importanceScore >= 0.3 ? "一般重要" : "不太重要";
    
    const urgencyLevel = urgencyScore >= 0.7 ? "非常紧急" : 
                         urgencyScore >= 0.5 ? "比较紧急" : 
                         urgencyScore >= 0.3 ? "一般紧急" : "不太紧急";
    
    const reasonings = {
        'important-urgent': [
            `此任务被评估为${importanceLevel}且${urgencyLevel}。它对项目成功至关重要且有紧急的截止日期，应优先处理。`,
            `这是一个${importanceLevel}且${urgencyLevel}的任务，应该优先处理，以避免重大后果。`,
            `该任务的截止日期迫在眉睫（${urgencyLevel}），并且由于其${importanceLevel}的特性，对整体目标有重大影响。`
        ],
        'important-not-urgent': [
            `此任务被评估为${importanceLevel}但${urgencyLevel}。它对长期目标很重要，但目前没有紧急性，可以计划在适当时间完成。`,
            `虽然不是非常紧急（${urgencyLevel}），但这个任务对您的进步${importanceLevel}，应该在合理的时间框架内完成。`,
            `这是一个战略性任务，对未来发展${importanceLevel}，应该投入充分的时间和注意力，但因为${urgencyLevel}，不需要立即处理。`
        ],
        'not-important-urgent': [
            `此任务被评估为${importanceLevel}但${urgencyLevel}。它有时间限制，但对整体目标影响较小，可以考虑委派给他人。`,
            `虽然有紧迫性（${urgencyLevel}），但这个任务对主要目标的影响${importanceLevel}，建议快速解决或考虑委派。`,
            `这是一个需要尽快处理（${urgencyLevel}）但价值较低（${importanceLevel}）的任务，建议快速解决或委派。`
        ],
        'not-important-not-urgent': [
            `此任务被评估为${importanceLevel}且${urgencyLevel}，可以放在最后处理或考虑是否真的需要完成。`,
            `这是一个低优先级的任务（${importanceLevel}且${urgencyLevel}），只有在其他更重要的工作完成后才需要关注。`,
            `该任务可能是一个分心项目（${importanceLevel}且${urgencyLevel}），建议评估它是否真的需要您的时间和注意力。`
        ]
    };
    
    // 随机选择一个理由
    const reasons = reasonings[quadrant];
    return reasons[Math.floor(Math.random() * reasons.length)];
}

// 显示AI分析结果
function displayAIResults(results) {
    const resultDiv = document.getElementById('ai-result-content');
    
    let html = '<div class="analysis-results">';
    
    // 按象限分组
    const groupedResults = {
        'important-urgent': [],
        'important-not-urgent': [],
        'not-important-urgent': [],
        'not-important-not-urgent': []
    };
    
    results.forEach(result => {
        const task = pendingTasks.find(t => t.id === result.id);
        if (task) {
            groupedResults[result.quadrant].push({
                ...result,
                text: task.text
            });
        }
    });
    
    // 显示分组结果
    html += '<div class="quadrant-group">';
    html += '<h4>重要且紧急</h4>';
    html += '<ul>';
    groupedResults['important-urgent'].forEach(item => {
        html += `<li><b>${item.text}</b><div class="reasoning">${item.reasoning}</div></li>`;
    });
    html += '</ul></div>';
    
    html += '<div class="quadrant-group">';
    html += '<h4>重要不紧急</h4>';
    html += '<ul>';
    groupedResults['important-not-urgent'].forEach(item => {
        html += `<li><b>${item.text}</b><div class="reasoning">${item.reasoning}</div></li>`;
    });
    html += '</ul></div>';
    
    html += '<div class="quadrant-group">';
    html += '<h4>紧急不重要</h4>';
    html += '<ul>';
    groupedResults['not-important-urgent'].forEach(item => {
        html += `<li><b>${item.text}</b><div class="reasoning">${item.reasoning}</div></li>`;
    });
    html += '</ul></div>';
    
    html += '<div class="quadrant-group">';
    html += '<h4>不重要不紧急</h4>';
    html += '<ul>';
    groupedResults['not-important-not-urgent'].forEach(item => {
        html += `<li><b>${item.text}</b><div class="reasoning">${item.reasoning}</div></li>`;
    });
    html += '</ul></div>';
    
    html += '</div>';
    
    // 存储结果供后续使用
    window.aiResults = results;
    
    resultDiv.innerHTML = html;
}

// 将待分析任务添加到指定象限
function applyAIResults() {
    if (!window.aiResults || window.aiResults.length === 0) {
        alert('没有可应用的分析结果');
        return;
    }
    
    // 对于每个分析结果
    window.aiResults.forEach(result => {
        const task = pendingTasks.find(t => t.id === result.id);
        if (task) {
            // 确定时间框架，使用任务中存储的时间框架或默认为currentTab
            let timeframe = task.timeFrame || currentTab;
            
            // 添加到正确的象限
            const quadrant = result.quadrant;
            
            // 添加任务
            tasks[timeframe][quadrant].push({
                id: task.id,
                text: task.text,
                completed: false,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // 清空待分析任务
    pendingTasks = [];
    window.aiResults = null;
    
    // 保存并刷新显示
    saveTasksToLocalStorage();
    renderAllTasks();
    
    // 隐藏分析结果模态框
    document.getElementById('ai-modal').style.display = 'none';
}

// 应用按钮的点击事件处理
document.getElementById('apply-ai-results').addEventListener('click', applyAIResults);

// 取消AI结果的点击事件处理
document.getElementById('cancel-ai-results').addEventListener('click', function() {
    document.getElementById('ai-result-modal').style.display = 'none';
});

// 保存任务到localStorage
function saveTasksToLocalStorage() {
    localStorage.setItem('todoMatrixTasks', JSON.stringify(tasks));
}

// 从localStorage加载任务
function loadTasksFromLocalStorage() {
    const savedTasks = localStorage.getItem('todoMatrixTasks');
    
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
}

// 初始化拖拽功能
function initializeDragAndDrop() {
    // 监听动态生成的任务项
    document.addEventListener('mousedown', function(e) {
        // 找到最近的任务项
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        // 如果是操作按钮，不启动拖拽
        if (e.target.closest('.task-actions')) return;
        
        // 阻止默认行为，防止文本选择
        e.preventDefault();
        
        // 创建一个函数来禁用文本选择
        function disableTextSelection() {
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.mozUserSelect = 'none';
            document.body.style.msUserSelect = 'none';
        }
        
        // 创建一个函数来恢复文本选择
        function enableTextSelection() {
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.body.style.mozUserSelect = '';
            document.body.style.msUserSelect = '';
        }
        
        // 禁用文本选择
        disableTextSelection();
        
        // 设置拖拽项
        draggedItem = taskItem;
        const rect = draggedItem.getBoundingClientRect();
        
        // 获取任务ID和当前象限信息
        const taskId = draggedItem.dataset.id;
        const originalQuadrant = draggedItem.closest('.matrix-quadrant');
        const originalTimeFrame = originalQuadrant.dataset.timeframe;
        const originalQuadrantType = originalQuadrant.dataset.quadrant;
        
        // 记录初始位置
        const startY = e.clientY;
        const startX = e.clientX;
        
        // 标记为拖拽中
        draggedItem.classList.add('dragging');
        
        // 创建一个占位元素，用于显示拖拽位置
        const placeholder = document.createElement('li');
        placeholder.className = 'task-placeholder';
        placeholder.style.height = rect.height + 'px';
        placeholder.style.display = 'none';
        
        // 存储原始位置信息
        draggedItem.dataset.originalQuadrant = originalQuadrantType;
        draggedItem.dataset.originalTimeframe = originalTimeFrame;
        
        // 复制一个拖拽元素的克隆体用于视觉跟随
        const ghostElement = taskItem.cloneNode(true);
        ghostElement.classList.add('task-ghost');
        ghostElement.style.position = 'fixed';
        ghostElement.style.top = rect.top + 'px';
        ghostElement.style.left = rect.left + 'px';
        ghostElement.style.width = rect.width + 'px';
        ghostElement.style.height = rect.height + 'px';
        ghostElement.style.pointerEvents = 'none';
        ghostElement.style.opacity = '0.8';
        ghostElement.style.zIndex = '1000';
        document.body.appendChild(ghostElement);
        
        // 监听鼠标移动
        function mouseMoveHandler(e) {
            if (!draggedItem) return;
            
            // 更新幽灵元素位置
            ghostElement.style.top = (e.clientY - (rect.height / 2)) + 'px';
            ghostElement.style.left = (e.clientX - (rect.width / 2)) + 'px';
            
            // 获取所有象限区域
            const quadrants = document.querySelectorAll('.matrix-quadrant');
            
            // 清除所有高亮
            quadrants.forEach(q => q.classList.remove('drop-target'));
            
            // 检查鼠标是否在某个象限内
            let currentQuadrant = null;
            quadrants.forEach(quadrant => {
                const quadrantRect = quadrant.getBoundingClientRect();
                
                if (
                    e.clientX >= quadrantRect.left &&
                    e.clientX <= quadrantRect.right &&
                    e.clientY >= quadrantRect.top &&
                    e.clientY <= quadrantRect.bottom
                ) {
                    // 高亮潜在的放置区域
                    quadrant.classList.add('drop-target');
                    currentQuadrant = quadrant;
                }
            });
            
            // 如果正在同一象限内拖动，处理排序逻辑
            if (currentQuadrant && 
                currentQuadrant.dataset.quadrant === originalQuadrantType && 
                currentQuadrant.dataset.timeframe === originalTimeFrame) {
                
                // 获取当前象限内的所有任务项（非拖拽中的项）
                const taskItems = Array.from(currentQuadrant.querySelectorAll('.task-item:not(.dragging)'));
                
                // 移除之前的占位符
                if (placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
                
                // 如果没有其他任务项，则直接添加占位符到列表末尾
                if (taskItems.length === 0) {
                    const taskList = currentQuadrant.querySelector('.task-list');
                    taskList.appendChild(placeholder);
                    placeholder.style.display = 'block';
                    return;
                }
                
                // 显示占位符
                placeholder.style.display = 'block';
                
                // 找到鼠标位置最近的任务项
                let closestTask = null;
                let closestOffset = Number.NEGATIVE_INFINITY;
                
                taskItems.forEach(item => {
                    const itemRect = item.getBoundingClientRect();
                    const offset = e.clientY - (itemRect.top + itemRect.height / 2);
                    
                    // 如果鼠标在当前项上方且比之前找到的更近
                    if (offset < 0 && offset > closestOffset) {
                        closestOffset = offset;
                        closestTask = item;
                    }
                });
                
                // 插入占位符
                if (closestTask) {
                    closestTask.parentNode.insertBefore(placeholder, closestTask);
                } else {
                    // 如果没有找到，放在最后
                    taskItems[taskItems.length - 1].parentNode.appendChild(placeholder);
                }
            } else {
                // 如果在不同象限或不在任何象限，隐藏占位符
                placeholder.style.display = 'none';
            }
        }
        
        // 监听鼠标释放
        function mouseUpHandler(e) {
            if (!draggedItem) return;
            
            // 恢复文本选择
            enableTextSelection();
            
            // 移除幽灵元素
            if (document.body.contains(ghostElement)) {
                document.body.removeChild(ghostElement);
            }
            
            // 获取放置区域
            const targetQuadrant = document.querySelector('.matrix-quadrant.drop-target');
            
            // 如果有有效的放置区域
            if (targetQuadrant) {
                const targetTimeFrame = targetQuadrant.dataset.timeframe;
                const targetQuadrantType = targetQuadrant.dataset.quadrant;
                
                // 判断是象限间移动还是同一象限内排序
                if (targetQuadrantType !== originalQuadrantType || targetTimeFrame !== originalTimeFrame) {
                    // 不同象限间移动
                    moveTaskToNewQuadrant(
                        taskId,
                        originalQuadrantType,
                        originalTimeFrame,
                        targetQuadrantType,
                        targetTimeFrame
                    );
                } else if (placeholder.parentNode) {
                    // 同一象限内排序
                    const taskItems = Array.from(targetQuadrant.querySelectorAll('.task-item'));
                    const taskIndex = taskItems.indexOf(draggedItem);
                    
                    // 查找占位符的索引
                    const placeholderIndex = Array.from(placeholder.parentNode.children).indexOf(placeholder);
                    
                    // 移除占位符
                    if (placeholder.parentNode) {
                        placeholder.parentNode.removeChild(placeholder);
                    }
                    
                    // 如果位置有变化，更新任务顺序
                    if (placeholderIndex !== -1 && placeholderIndex !== taskIndex) {
                        reorderTasksInQuadrant(
                            taskId,
                            targetQuadrantType,
                            targetTimeFrame,
                            placeholderIndex > taskIndex ? placeholderIndex - 1 : placeholderIndex
                        );
                    }
                }
            }
            
            // 清理
            document.querySelectorAll('.matrix-quadrant').forEach(q => {
                q.classList.remove('drop-target');
            });
            
            // 移除占位符
            if (placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }
            
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
            
            // 移除事件监听器
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        }
        
        // 添加事件监听器
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    });
}

// 移动任务到新象限
function moveTaskToNewQuadrant(taskId, sourceQuadrant, sourceTimeFrame, targetQuadrant, targetTimeFrame) {
    // 查找任务在源象限中的索引
    const taskIndex = tasks[sourceTimeFrame][sourceQuadrant].findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        // 获取任务
        const task = tasks[sourceTimeFrame][sourceQuadrant][taskIndex];
        
        // 从源象限中移除
        tasks[sourceTimeFrame][sourceQuadrant].splice(taskIndex, 1);
        
        // 添加到目标象限
        tasks[targetTimeFrame][targetQuadrant].push(task);
        
        // 重新渲染
        renderTasksForQuadrant(sourceTimeFrame, sourceQuadrant);
        renderTasksForQuadrant(targetTimeFrame, targetQuadrant);
        
        // 保存到本地存储
        saveTasksToLocalStorage();
    }
}

// 在同一象限内重新排序任务
function reorderTasksInQuadrant(taskId, quadrant, timeFrame, newIndex) {
    // 获取当前象限的任务列表
    const quadrantTasks = tasks[timeFrame][quadrant];
    
    // 查找任务的当前索引
    const currentIndex = quadrantTasks.findIndex(t => t.id === taskId);
    
    if (currentIndex !== -1 && currentIndex !== newIndex) {
        // 从数组中移除任务
        const [task] = quadrantTasks.splice(currentIndex, 1);
        
        // 在新位置插入任务
        quadrantTasks.splice(newIndex, 0, task);
        
        // 重新渲染该象限的任务
        renderTasksForQuadrant(timeFrame, quadrant);
        
        // 保存到本地存储
        saveTasksToLocalStorage();
    }
}

// 渲染所有任务
function renderAllTasks() {
    // 渲染每个时间框架的任务
    for (const timeFrame in tasks) {
        renderTasksForTimeFrame(timeFrame);
    }
}

// 为特定时间框架渲染任务
function renderTasksForTimeFrame(timeFrame) {
    // 渲染每个象限的任务
    renderTasksForQuadrant(timeFrame, 'important-urgent');
    renderTasksForQuadrant(timeFrame, 'important-not-urgent');
    renderTasksForQuadrant(timeFrame, 'not-important-urgent');
    renderTasksForQuadrant(timeFrame, 'not-important-not-urgent');
}

// 为特定象限渲染任务
function renderTasksForQuadrant(timeFrame, quadrant) {
    const quadrantId = mapQuadrantToId(quadrant, timeFrame);
    const taskList = document.getElementById(quadrantId);
    const quadrantTasks = tasks[timeFrame][quadrant];
    
    // 清空当前列表
    taskList.innerHTML = '';
    
    // 添加任务到列表
    quadrantTasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;
        
        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = '编辑任务';
        editBtn.addEventListener('click', () => editTask(timeFrame, quadrant, task.id));
        
        const completeBtn = document.createElement('button');
        completeBtn.className = 'complete-btn';
        completeBtn.innerHTML = task.completed ? '<i class="fas fa-undo"></i>' : '<i class="fas fa-check"></i>';
        completeBtn.title = task.completed ? '标记为未完成' : '标记为已完成';
        completeBtn.addEventListener('click', () => toggleTaskCompletion(timeFrame, quadrant, task.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = '删除任务';
        deleteBtn.addEventListener('click', () => deleteTask(timeFrame, quadrant, task.id));
        
        taskActions.appendChild(editBtn);
        taskActions.appendChild(completeBtn);
        taskActions.appendChild(deleteBtn);
        
        taskItem.appendChild(taskText);
        taskItem.appendChild(taskActions);
        taskList.appendChild(taskItem);
    });
}

// 将象限映射到HTML ID
function mapQuadrantToId(quadrant, timeFrame) {
    const idMap = {
        'important-urgent': `important-urgent-${timeFrame}`,
        'important-not-urgent': `important-not-urgent-${timeFrame}`,
        'not-important-urgent': `not-important-urgent-${timeFrame}`,
        'not-important-not-urgent': `not-important-not-urgent-${timeFrame}`
    };
    
    return idMap[quadrant];
}

// 切换任务完成状态
function toggleTaskCompletion(timeFrame, quadrant, taskId) {
    const taskIndex = tasks[timeFrame][quadrant].findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        const task = tasks[timeFrame][quadrant][taskIndex];
        task.completed = !task.completed;
        
        // 如果任务被标记为完成，显示烟花效果
        if (task.completed) {
            showConfetti();
        }
        
        // 重新渲染并保存
        renderTasksForQuadrant(timeFrame, quadrant);
        saveTasksToLocalStorage();
    }
}

// 显示烟花特效
function showConfetti() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
    });
}

// 删除任务
function deleteTask(timeFrame, quadrant, taskId) {
    const taskIndex = tasks[timeFrame][quadrant].findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[timeFrame][quadrant].splice(taskIndex, 1);
        renderTasksForQuadrant(timeFrame, quadrant);
        saveTasksToLocalStorage();
    }
}

// 编辑任务
function editTask(timeFrame, quadrant, taskId) {
    const taskIndex = tasks[timeFrame][quadrant].findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        const task = tasks[timeFrame][quadrant][taskIndex];
        const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
        
        if (taskItem) {
            // 检查是否已经在编辑模式
            if (taskItem.querySelector('.task-edit-input')) {
                return;
            }
            
            // 隐藏任务文本
            const taskText = taskItem.querySelector('.task-text');
            taskText.style.display = 'none';
            
            // 创建编辑输入框
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'task-edit-input';
            editInput.value = task.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit();
                }
            });
            
            // 创建保存和取消按钮容器
            const editActions = document.createElement('div');
            editActions.className = 'edit-actions';
            
            // 创建保存按钮
            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-edit-btn';
            saveBtn.innerHTML = '<i class="fas fa-save"></i>';
            saveBtn.title = '保存';
            saveBtn.addEventListener('click', saveEdit);
            
            // 创建取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-edit-btn';
            cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
            cancelBtn.title = '取消';
            cancelBtn.addEventListener('click', cancelEdit);
            
            // 添加按钮到容器
            editActions.appendChild(saveBtn);
            editActions.appendChild(cancelBtn);
            
            // 插入编辑元素
            taskItem.insertBefore(editInput, taskText);
            taskItem.insertBefore(editActions, taskItem.querySelector('.task-actions'));
            
            // 聚焦到输入框
            editInput.focus();
            
            // 暂时隐藏原任务操作按钮
            taskItem.querySelector('.task-actions').style.display = 'none';
            
            // 保存编辑函数
            function saveEdit() {
                const newText = editInput.value.trim();
                if (newText) {
                    // 更新任务文本
                    task.text = newText;
                    taskText.textContent = newText;
                    
                    // 保存到本地存储
                    saveTasksToLocalStorage();
                }
                
                // 清理编辑界面
                exitEditMode();
            }
            
            // 取消编辑函数
            function cancelEdit() {
                exitEditMode();
            }
            
            // 退出编辑模式函数
            function exitEditMode() {
                // 显示任务文本
                taskText.style.display = '';
                
                // 删除编辑元素
                if (taskItem.contains(editInput)) {
                    taskItem.removeChild(editInput);
                }
                if (taskItem.contains(editActions)) {
                    taskItem.removeChild(editActions);
                }
                
                // 显示原任务操作按钮
                taskItem.querySelector('.task-actions').style.display = '';
            }
        }
    }
} 