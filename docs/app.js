// AI C2less Real-time Lab Demo Application
class C2Demo {
    constructor() {
        this.campaignData = {
            "campaign_id": "cmp-2025-0819-001",
            "start_time": "2025-08-19T10:32:15Z",
            "end_time": "2025-08-19T11:05:42Z",
            "agents": [
                {
                    "agent_id": "agt-7f3a1", "ip": "10.24.5.112",
                    "commands": [
                        {"cmd": "ping -c 4 api.target.local", "issued": "2025-08-19T10:33:00Z", "response": "4 packets transmitted, 4 received, 0% packet loss"},
                        {"cmd": "cat /etc/os-release", "issued": "2025-08-19T10:35:12Z", "response": "Ubuntu 22.04.4 LTS (Jammy Jellyfish)"}
                    ]
                },
                {
                    "agent_id": "agt-9b8d2", "ip": "10.24.7.89",
                    "commands": [{"cmd": "df -h", "issued": "2025-08-19T10:37:45Z", "response": "/dev/root  50G  21G  29G  42% /"}]
                }
            ],
            "metrics": {"total_agents": 2, "total_commands": 3, "success_rate": "100%"}
        };

        this.phases = [
            {"name": "Campaign Initialization", "duration": 3},
            {"name": "Infrastructure Setup", "duration": 4},
            {"name": "Command Dispatch", "duration": 2},
            {"name": "Agent Execution", "duration": 8},
            {"name": "Results Collection", "duration": 3},
            {"name": "Final Reporting", "duration": 2}
        ];

        this.isRunning = false; this.currentPhase = 0; this.speed = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createTimeline();
        this.resetDemo();
    }

    setupEventListeners() {
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartDemo());
        document.getElementById('speedSelect').addEventListener('change', (e) => this.setSpeed(parseInt(e.target.value)));
    }

    createTimeline() {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';
        this.phases.forEach(phase => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `<div class="timeline-item__title">${phase.name}</div><div class="timeline-item__status">Pending</div>`;
            timeline.appendChild(item);
        });
    }

    togglePlayPause() {
        if (!this.isRunning) this.startDemo();
        else this.pauseDemo();
    }

    startDemo() {
        this.isRunning = true;
        this.updateStatus('Demo running...');
        document.getElementById('campaignId').textContent = this.campaignData.campaign_id;
        this.runPhases();
    }

    restartDemo() { 
        this.isRunning = false; this.currentPhase = 0; this.resetDemo(); 
        this.updateStatus('Ready to start');
        document.getElementById('progressFill').style.width = '0%';
    }

    setSpeed(speed) { this.speed = speed; }

    updateStatus(status) { document.getElementById('demoStatus').textContent = status; }

    resetDemo() {
        document.querySelectorAll('.timeline-item').forEach(item => {
            item.classList.remove('active', 'completed');
            item.querySelector('.timeline-item__status').textContent = 'Pending';
        });
        document.querySelectorAll('.node').forEach(node => node.classList.remove('active', 'executing', 'completed'));
        document.getElementById('terminalBody').innerHTML = '<div class="terminal-line"><span class="terminal-prompt">c2less@lab:~$</span> <span class="terminal-text">Waiting for campaign to start...</span></div>';
        document.getElementById('reportContainer').style.display = 'none';
    }

    async runPhases() {
        for (let i = 0; i < this.phases.length && this.isRunning; i++) {
            await this.executePhase(i);
        }
        if (this.isRunning) this.completeDemo();
    }

    async executePhase(phaseIndex) {
        const timelineItems = document.querySelectorAll('.timeline-item');
        const currentItem = timelineItems[phaseIndex];
        
        currentItem.classList.add('active');
        this.addTerminalLine(`[INFO] ${this.phases[phaseIndex].name}`, 'terminal-success');
        
        if (phaseIndex === 3) { // Agent Execution
            for (const agent of this.campaignData.agents) {
                for (const cmd of agent.commands) {
                    this.addTerminalLine(`${agent.agent_id}@${agent.ip}:~$ ${cmd.cmd}`, 'terminal-command');
                    await this.sleep(1000 / this.speed);
                    this.addTerminalLine(cmd.response, 'terminal-response');
                    await this.sleep(500 / this.speed);
                }
            }
        } else {
            await this.sleep(this.phases[phaseIndex].duration * 1000 / this.speed);
        }
        
        currentItem.classList.remove('active');
        currentItem.classList.add('completed');
        this.updateProgressBar(phaseIndex + 1);
    }

    completeDemo() {
        this.updateStatus('Demo completed successfully');
        document.getElementById('reportContainer').style.display = 'block';
        document.getElementById('totalAgents').textContent = this.campaignData.metrics.total_agents;
        document.getElementById('totalCommands').textContent = this.campaignData.metrics.total_commands;
        document.getElementById('successRate').textContent = this.campaignData.metrics.success_rate;
        document.getElementById('campaignDuration').textContent = '33 min';
    }

    updateProgressBar(completed) {
        document.getElementById('progressFill').style.width = `${(completed/this.phases.length)*100}%`;
    }

    addTerminalLine(text, className = 'terminal-text') {
        const terminalBody = document.getElementById('terminalBody');
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.innerHTML = `<span class="terminal-text ${className}">${text}</span>`;
        terminalBody.appendChild(line);
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

document.addEventListener('DOMContentLoaded', () => new C2Demo());
