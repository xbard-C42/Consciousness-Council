/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

document.addEventListener('DOMContentLoaded', () => {

    // --- Start of Agent Card Management code ---
    function initializeAgentCards() {
        const agentConfigGrid = document.querySelector('.agent-config-grid');
        if (!agentConfigGrid) return;

        const updateAgentCount = () => {
            const agentCards = agentConfigGrid.querySelectorAll('.agent-card');
            agentCards.forEach((card, index) => {
                const title = card.querySelector('h4');
                if (title) {
                    const originalTitle = title.getAttribute('data-original-title') || title.textContent?.split(' (')[0].trim();
                     if(originalTitle) {
                       title.setAttribute('data-original-title', originalTitle);
                       title.textContent = `${originalTitle} (Agent ${index + 1})`;
                    }
                }
                
                card.querySelectorAll('select, input, textarea').forEach(el => {
                    const oldId = el.id;
                    if (!oldId) return;
                    const idParts = oldId.split('-');
                    if (idParts.length > 2) {
                        const newId = `agent-${index + 1}-${idParts.slice(2).join('-')}`;
                        el.id = newId;

                        const label = card.querySelector(`label[for="${oldId}"]`);
                        if (label instanceof HTMLLabelElement) {
                             label.htmlFor = newId;
                        }
                    }
                });
            });
             const addBtn = agentConfigGrid.querySelector('.add-agent-btn');
             const allCards = agentConfigGrid.querySelectorAll('.agent-card');
             if(addBtn) {
                (addBtn as HTMLButtonElement).disabled = allCards.length >= 8; // Limit to 8 agents
             }
        };

        agentConfigGrid.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const addBtn = agentConfigGrid.querySelector('.add-agent-btn');

            if (target === addBtn) {
                const lastAgentCard = agentConfigGrid.querySelector('.agent-card:last-of-type');
                if (!lastAgentCard || agentConfigGrid.querySelectorAll('.agent-card').length >= 8) return;

                const newCard = lastAgentCard.cloneNode(true) as HTMLElement;
                
                if (!newCard.querySelector('.remove-agent-btn')) {
                    const header = newCard.querySelector('.agent-card-header');
                    if (header) {
                        const removeBtn = document.createElement('button');
                        removeBtn.className = 'remove-agent-btn';
                        removeBtn.innerHTML = '&times;';
                        removeBtn.setAttribute('aria-label', 'Remove Agent');
                        header.appendChild(removeBtn);
                    }
                }
                
                agentConfigGrid.insertBefore(newCard, addBtn);
                updateAgentCount();
            }

            const removeBtn = target.closest('.remove-agent-btn');
            if (removeBtn) {
                const cardToRemove = removeBtn.closest('.agent-card');
                if (cardToRemove && agentConfigGrid.querySelectorAll('.agent-card').length > 1) {
                    cardToRemove.remove();
                    updateAgentCount();
                } else {
                    alert("You must have at least one agent in the council.");
                }
            }
        });

        updateAgentCount();
    }
    // --- End of Agent Card code ---


    // --- Start of Council Interface code ---
    function initializeCouncilInterface() {
        const startBtn = document.getElementById('start-session-btn');
        const continueBtn = document.getElementById('continue-discussion-btn');
        const outputContainer = document.getElementById('council-output-container');
        const topicTextarea = document.getElementById('council-topic') as HTMLTextAreaElement;
    
        if (!startBtn || !continueBtn || !outputContainer || !topicTextarea) {
            return;
        }
    
        let councilIframe: HTMLIFrameElement | null = null;

        startBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const topic = topicTextarea.value.trim();
            if (!topic) {
                topicTextarea.style.borderColor = '#EF4444';
                topicTextarea.focus();
                setTimeout(() => { topicTextarea.style.borderColor = ''; }, 2000);
                return;
            }
    
            const sessionId = crypto.randomUUID();
            const theme = 'dark'; 
            const source = 'c42os';
            
            const externalAppUrl = './community_app.html';
            
            const queryParams = new URLSearchParams({ source, theme, topic, sessionId });
            const iframeUrl = `${externalAppUrl}?${queryParams.toString()}`;
    
            outputContainer.innerHTML = ''; 
    
            const iframe = document.createElement('iframe');
            iframe.src = iframeUrl;
            iframe.title = 'C42 OS Council Session Output';
            
            outputContainer.appendChild(iframe);
            outputContainer.style.display = 'block';

            councilIframe = iframe;
    
            outputContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
            (startBtn as HTMLButtonElement).disabled = true;
            (continueBtn as HTMLButtonElement).disabled = false;
            
            topicTextarea.addEventListener('input', () => {
                 (startBtn as HTMLButtonElement).disabled = false;
            }, { once: true });
        });

        window.addEventListener('message', async (event) => {
            if (event.origin !== window.location.origin) {
                console.warn(`Message from unexpected origin (${event.origin}) blocked.`);
                return;
            }

            if (event.data && event.data.type === 'c42-generate-response' && councilIframe && councilIframe.contentWindow) {
                const { topic: iframeTopic } = event.data;

                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `You are an AI agent participating in a collaborative council. The topic of discussion is: "${iframeTopic}". Please provide your initial perspective on this topic.`;
                    
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-preview-04-17',
                        contents: prompt,
                    });
                    
                    councilIframe.contentWindow.postMessage({ type: 'c42-response-generated', payload: { text: response.text } }, window.location.origin);
        
                } catch (error) {
                    console.error("Error calling Gemini API:", error);
                    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                    councilIframe.contentWindow.postMessage({ type: 'c42-response-error', payload: { error: `Failed to get response from AI: ${errorMessage}` } }, window.location.origin);
                }
            }
        });
    }
    // --- End of Council Interface code ---

    // --- Start of touch adjustment code ---
    function handleTouchInputAdjustments() {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouchDevice || !('visualViewport' in window)) {
            return;
        }

        const viewPort = window.visualViewport;
        if (!viewPort) return;
        
        const onViewportResize = () => {
            const isKeyboardVisible = (viewPort.height < window.innerHeight * 0.75);
            document.body.classList.toggle('keyboard-active', isKeyboardVisible);
        };

        const onInputFocus = (event: Event) => {
            const target = event.target as HTMLElement;
            setTimeout(() => {
                 target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        };

        viewPort.addEventListener('resize', onViewportResize);

        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', onInputFocus);
        });
    }
    // --- End of touch adjustment code ---

    // --- Start of landing page scripts ---
    function initializeScrollReveal() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, observerOptions);

        const revealElements = document.querySelectorAll('.reveal');
        revealElements.forEach(el => observer.observe(el));
    }

    function initializeSecurityDemo() {
        const publicBtn = document.getElementById('public-mode-btn');
        const enterpriseBtn = document.getElementById('enterprise-mode-btn');
        const publicDemo = document.getElementById('public-mode-demo');
        const enterpriseDemo = document.getElementById('enterprise-mode-demo');

        if (!publicBtn || !enterpriseBtn || !publicDemo || !enterpriseDemo) return;

        const showSecurityMode = (mode: 'public' | 'enterprise') => {
            publicBtn.classList.toggle('active', mode === 'public');
            enterpriseBtn.classList.toggle('active', mode === 'enterprise');
            publicDemo.classList.toggle('active', mode === 'public');
            enterpriseDemo.classList.toggle('active', mode === 'enterprise');
        };

        publicBtn.addEventListener('click', () => showSecurityMode('public'));
        enterpriseBtn.addEventListener('click', () => showSecurityMode('enterprise'));
    }

    function initializeSmoothScroll() {
         document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if(!targetId) return;
                const target = document.querySelector(targetId);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    initializeScrollReveal();
    initializeSecurityDemo();
    initializeSmoothScroll();
    // --- End of landing page scripts ---

    // Initialize all components
    initializeAgentCards();
    initializeCouncilInterface();
    handleTouchInputAdjustments();
});
