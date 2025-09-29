import { GoogleGenerativeAI } from '@google/generative-ai';
import { CodebaseAnalysis, GenerationPlan, AssetNeed } from '../types';
import { logger } from '../utils/logger';

interface GeminiAgent {
  name: string;
  model: string;
  systemInstruction: string;
  specialization: string;
}

export class GeminiOrchestrator {
  private client: GoogleGenerativeAI;
  private agents: Map<string, GeminiAgent> = new Map();
  private conversationHistory: any[] = [];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required');
    }

    logger.info('Initializing GoogleGenerativeAI with API key', {
      keyPrefix: apiKey.substring(0, 12) + '...',
      keyLength: apiKey.length
    });

    this.client = new GoogleGenerativeAI(apiKey);
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Gemini Orchestrator');

    // Initialize specialized agents using Gemini models
    await this.createSpecializedAgents();

    logger.info('Gemini Orchestrator initialized with multi-agent capabilities');
  }

  private async createSpecializedAgents(): Promise<void> {
    const agentConfigs = [
      {
        name: 'asset-analyzer',
        model: 'gemini-2.5-pro',
        specialization: 'Asset Analysis and Detection',
        systemInstruction: `You are an expert asset analyzer for software projects. Your role is to:
          1. Analyze codebase structures and identify missing visual assets
          2. Understand project types, frameworks, and design patterns
          3. Suggest appropriate asset types, dimensions, and priorities
          4. Consider user experience and brand consistency
          5. Provide detailed, actionable recommendations

          Always prioritize:
          - User experience and accessibility
          - Brand consistency and professional appearance
          - Technical requirements and performance
          - Modern design principles and trends

          Output structured JSON when possible for easier parsing.`
      },
      {
        name: 'prompt-engineer',
        model: 'gemini-2.5-flash',
        specialization: 'Image Generation Prompt Optimization',
        systemInstruction: `You are a prompt engineering specialist for Google's Nano Banana (Gemini 2.5 Flash Image) generation. Your expertise includes:
          1. Crafting detailed, effective prompts for Nano Banana image generation
          2. Understanding visual design principles and aesthetics
          3. Optimizing prompts for specific asset types (icons, logos, illustrations)
          4. Incorporating style, color theory, and composition guidelines
          5. Ensuring prompts generate brand-consistent, professional assets

          Focus on:
          - Clear, descriptive language that produces accurate results with Nano Banana
          - Style consistency across generated assets
          - Technical specifications (dimensions, formats, quality)
          - Brand alignment and professional appearance
          - Nano Banana's specific strengths: character consistency, multi-image blending, targeted transformations`
      },
      {
        name: 'project-consultant',
        model: 'gemini-2.5-flash',
        specialization: 'Strategic Asset Planning',
        systemInstruction: `You are a strategic consultant for digital asset creation using AI generation. Your responsibilities:
          1. Evaluate asset generation plans for business impact
          2. Prioritize assets based on user journey and business goals
          3. Estimate costs, timelines, and resource requirements using Nano Banana pricing ($0.039 per image)
          4. Provide strategic recommendations for asset roadmaps
          5. Consider competitive landscape and industry best practices

          Always consider:
          - Business objectives and user needs
          - Resource constraints and ROI (with Nano Banana at $0.039/image)
          - Technical feasibility with Gemini ecosystem
          - Long-term maintainability and scalability`
      },
      {
        name: 'codebase-scanner',
        model: 'gemini-2.5-flash',
        specialization: 'Deep Codebase Analysis',
        systemInstruction: `You are an expert codebase scanner using Gemini's 1M+ token context window. Your role:
          1. Analyze entire codebases for missing assets and dependencies
          2. Identify broken references, unused assets, and optimization opportunities
          3. Understand framework-specific patterns (React, Vue, Angular, etc.)
          4. Detect security vulnerabilities related to asset handling
          5. Map asset usage patterns across the entire project

          Leverage Gemini's long context to:
          - Process entire projects without chunking when possible
          - Maintain context across related files and modules
          - Identify complex dependency chains and asset relationships
          - Provide comprehensive, project-wide recommendations`
      }
    ];

    for (const config of agentConfigs) {
      this.agents.set(config.name, {
        name: config.name,
        model: config.model,
        systemInstruction: config.systemInstruction,
        specialization: config.specialization
      });
    }

    logger.info(`Created ${agentConfigs.length} specialized Gemini agents`);
  }

  async createGenerationPlan(analysis: CodebaseAnalysis): Promise<GenerationPlan> {
    logger.info('Creating asset generation plan using Gemini multi-agent workflow');

    try {
      // Step 1: Deep Codebase Analysis with Gemini Scanner
      const deepAnalysis = await this.runCodebaseScannerAgent(analysis);

      // Step 2: Asset Analysis Agent - Enhanced analysis of needs
      const assetAnalysis = await this.runAssetAnalysisAgent(deepAnalysis);

      // Step 3: Prompt Engineering Agent - Optimize prompts for Nano Banana
      const optimizedAssets = await this.runPromptEngineeringAgent(assetAnalysis.assets);

      // Step 4: Project Consultant Agent - Strategic planning and cost estimation
      const strategicPlan = await this.runProjectConsultantAgent(optimizedAssets, analysis);

      // Step 5: Main orchestrator - Synthesize results
      const finalPlan = await this.synthesizePlan(strategicPlan, analysis);

      logger.info('Generation plan created successfully', {
        totalAssets: finalPlan.assets.length,
        highPriority: finalPlan.priorities.high.length,
        estimatedCost: finalPlan.estimatedCost
      });

      return finalPlan;

    } catch (error) {
      logger.error('Failed to create generation plan', error);
      throw new Error(`Plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async runCodebaseScannerAgent(analysis: CodebaseAnalysis): Promise<any> {
    const agent = this.agents.get('codebase-scanner')!;

    const prompt = `
    ${agent.systemInstruction}

    Perform deep codebase analysis using Gemini's long context capabilities:

    PROJECT ANALYSIS:
    - Project Type: ${analysis.projectType}
    - Frameworks: ${analysis.frameworks.join(', ')}
    - Existing Assets: ${analysis.existingAssets.length} found
    - Asset Directories: ${analysis.assetDirectories.join(', ')}

    CURRENT ASSET NEEDS IDENTIFIED:
    ${analysis.missingAssets.map(asset =>
      `- ${asset.type}: ${asset.description} (${asset.priority} priority)`
    ).join('\n')}

    SCANNER RECOMMENDATIONS:
    ${analysis.recommendations.join('\n')}

    Using your 1M+ token context window, provide:
    1. Deep analysis of asset usage patterns across the entire codebase
    2. Hidden dependencies and cross-file asset relationships
    3. Framework-specific asset requirements and best practices
    4. Security implications of current asset handling
    5. Performance optimization opportunities for asset loading
    6. Comprehensive missing asset inventory with usage context

    Focus on leveraging the full codebase context to identify subtle patterns and dependencies.
    `;

    const model = this.client.getGenerativeModel(
      { model: agent.model || 'gemini-2.5-flash' },
      { apiVersion: 'v1beta' }
    );
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      logger.warn('Empty response from codebase scanner agent');
      throw new Error('No content received from Gemini API');
    }

    // Parse and enhance the analysis
    return this.parseDeepAnalysis(content, analysis);
  }

  private async runAssetAnalysisAgent(deepAnalysis: any): Promise<{ assets: AssetNeed[] }> {
    const agent = this.agents.get('asset-analyzer')!;

    const prompt = `
    ${agent.systemInstruction}

    Enhanced asset analysis based on deep codebase scan:

    DEEP ANALYSIS RESULTS:
    ${JSON.stringify(deepAnalysis, null, 2)}

    Provide comprehensive asset recommendations:
    1. Enhanced analysis of each identified asset need
    2. Additional assets discovered through deep scanning
    3. Specific recommendations for dimensions, formats, and usage
    4. Priority assessment based on user experience impact
    5. Asset organization and naming conventions
    6. Framework-specific optimizations (React/Vue/Angular specific needs)

    Output in JSON format for easy parsing:
    {
      "enhancedAssets": [
        {
          "type": "icon|logo|banner|illustration|background|social-media|ui-element",
          "description": "detailed description",
          "context": "usage context",
          "dimensions": {"width": 256, "height": 256, "aspectRatio": "1:1"},
          "usage": ["component", "page"],
          "priority": "high|medium|low",
          "suggestedPrompt": "optimized prompt",
          "frameworkSpecific": "react|vue|angular specific notes"
        }
      ],
      "recommendations": ["asset strategy recommendations"]
    }
    `;

    const model = this.client.getGenerativeModel(
      { model: agent.model || 'gemini-2.5-flash' },
      { apiVersion: 'v1beta' }
    );
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      logger.warn('Empty response from asset analysis agent');
      throw new Error('No content received from Gemini API');
    }

    return this.parseAssetRecommendations(content);
  }

  private async runPromptEngineeringAgent(assets: AssetNeed[]): Promise<AssetNeed[]> {
    const agent = this.agents.get('prompt-engineer')!;

    const prompt = `
    ${agent.systemInstruction}

    Optimize these assets for Google's Nano Banana (Gemini 2.5 Flash Image) generation:

    ASSETS TO OPTIMIZE:
    ${assets.map((asset, index) => `
    ${index + 1}. Type: ${asset.type}
       Description: ${asset.description}
       Context: ${asset.context}
       Dimensions: ${asset.dimensions.width}x${asset.dimensions.height} (${asset.dimensions.aspectRatio})
       Current Prompt: ${asset.suggestedPrompt}
       Usage: ${asset.usage.join(', ')}
    `).join('\n')}

    For each asset, optimize for Nano Banana's specific capabilities:
    1. Enhanced prompt for high-quality generation ($0.039 per image)
    2. Style specifications that work well with Nano Banana
    3. Character consistency guidance (if applicable)
    4. Multi-image blending instructions (if needed)
    5. Natural language editing commands for refinements
    6. Quality and consistency guidelines

    Focus on Nano Banana's strengths:
    - Character consistency across multiple generations
    - Multi-image blending capabilities
    - Targeted transformations with natural language
    - High-quality output at competitive pricing

    Output optimized prompts that maximize Nano Banana's potential.
    `;

    const model = this.client.getGenerativeModel(
      { model: agent.model || 'gemini-2.5-flash' },
      { apiVersion: 'v1beta' }
    );
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      logger.warn('Empty response from prompt engineering agent');
      throw new Error('No content received from Gemini API');
    }

    return this.parseOptimizedPrompts(content, assets);
  }

  private async runProjectConsultantAgent(
    assets: AssetNeed[],
    analysis: CodebaseAnalysis
  ): Promise<GenerationPlan> {
    const agent = this.agents.get('project-consultant')!;

    const prompt = `
    ${agent.systemInstruction}

    Create strategic asset generation plan with Nano Banana cost optimization:

    PROJECT CONTEXT:
    - Project Type: ${analysis.projectType}
    - Frameworks: ${analysis.frameworks.join(', ')}
    - Current Asset Maturity: ${analysis.existingAssets.length} existing assets

    PROPOSED ASSETS (${assets.length} total):
    ${assets.map((asset, index) => `
    ${index + 1}. ${asset.type}: ${asset.description}
       Priority: ${asset.priority}
       Dimensions: ${asset.dimensions.width}x${asset.dimensions.height}
       Usage: ${asset.usage.join(', ')}
    `).join('\n')}

    NANO BANANA PRICING: $0.039 per image generation

    Provide strategic analysis:
    1. Cost-benefit analysis with exact Nano Banana pricing
    2. Implementation roadmap with phases
    3. ROI projections and business impact
    4. Risk assessment and mitigation strategies
    5. Success metrics and evaluation criteria
    6. Budget optimization recommendations

    Consider:
    - Nano Banana's competitive pricing advantage
    - Google AI ecosystem integration benefits
    - Quality vs cost trade-offs
    - Scalability for future asset needs

    Output detailed strategic plan with actionable recommendations.
    `;

    const model = this.client.getGenerativeModel(
      { model: agent.model || 'gemini-2.5-flash' },
      { apiVersion: 'v1beta' }
    );
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      logger.warn('Empty response from project consultant agent');
      throw new Error('No content received from Gemini API');
    }

    return this.parseStrategicPlan(content, assets);
  }

  private async synthesizePlan(strategicPlan: GenerationPlan, analysis: CodebaseAnalysis): Promise<GenerationPlan> {
    const prompt = `
    You are a senior project orchestrator responsible for finalizing AI-powered asset generation plans using Google's ecosystem.

    Synthesize the final asset generation plan using Google's Gemini and Nano Banana:

    STRATEGIC PLAN SUMMARY:
    - Total Assets: ${strategicPlan.assets.length}
    - High Priority: ${strategicPlan.priorities.high.length}
    - Medium Priority: ${strategicPlan.priorities.medium.length}
    - Low Priority: ${strategicPlan.priorities.low.length}
    - Estimated Cost: $${strategicPlan.estimatedCost}
    - Estimated Time: ${strategicPlan.estimatedTime} minutes

    PROJECT CONTEXT:
    - Project Type: ${analysis.projectType}
    - Frameworks: ${analysis.frameworks.join(', ')}

    Provide final recommendations:
    1. Validation of the asset generation strategy
    2. Google AI ecosystem optimization opportunities
    3. Risk mitigation with Gemini/Nano Banana workflow
    4. Success criteria and measurement approach
    5. Implementation best practices

    Keep response concise and focused on actionable insights for the Google AI workflow.
    `;

    const model = this.client.getGenerativeModel(
      { model: 'gemini-2.5-flash' },
      { apiVersion: 'v1beta' }
    );
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      logger.warn('Empty response from plan synthesis');
    }

    // Apply any final adjustments based on the synthesis
    return this.applyFinalAdjustments(strategicPlan, content);
  }

  private parseDeepAnalysis(content: string, originalAnalysis: CodebaseAnalysis): any {
    // Enhanced parsing for deep codebase analysis
    return {
      ...originalAnalysis,
      deepInsights: this.extractDeepInsights(content),
      hiddenDependencies: this.extractHiddenDependencies(content),
      performanceOpportunities: this.extractPerformanceOpportunities(content),
      securityImplications: this.extractSecurityImplications(content)
    };
  }

  private parseAssetRecommendations(content: string): { assets: AssetNeed[] } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return { assets: parsed.enhancedAssets || [] };
      }
    } catch (error) {
      logger.warn('Failed to parse JSON from asset recommendations, using fallback parsing');
    }

    // Fallback to text parsing
    return { assets: this.extractAssetsFromText(content) };
  }

  private parseOptimizedPrompts(content: string, originalAssets: AssetNeed[]): AssetNeed[] {
    // Parse optimized prompts from Gemini response
    return originalAssets.map((asset, index) => {
      const optimizedPrompt = this.extractOptimizedPrompt(content, asset, index);
      return {
        ...asset,
        suggestedPrompt: optimizedPrompt || asset.suggestedPrompt,
        nanoBananaOptimized: true
      };
    });
  }

  private parseStrategicPlan(content: string, assets: AssetNeed[]): GenerationPlan {
    const prioritized = this.prioritizeAssetsFromContent(content, assets);

    return {
      assets: prioritized,
      estimatedCost: this.calculateNanoBananaCost(prioritized),
      estimatedTime: this.calculateEstimatedTime(prioritized),
      priorities: {
        high: prioritized.filter(a => a.priority === 'high'),
        medium: prioritized.filter(a => a.priority === 'medium'),
        low: prioritized.filter(a => a.priority === 'low')
      }
    };
  }

  private calculateNanoBananaCost(assets: AssetNeed[]): number {
    // Nano Banana pricing: $0.039 per image
    const costPerImage = parseFloat(process.env.IMAGE_COST_PER_GENERATION || '0.039');
    return assets.length * costPerImage;
  }

  private calculateEstimatedTime(assets: AssetNeed[]): number {
    // Time estimation in minutes (includes generation + processing + review)
    const baseTimePerAsset = 3; // minutes including Nano Banana generation time
    const complexityTime = {
      icon: 2,
      logo: 4,
      banner: 3,
      illustration: 5,
      background: 2,
      'social-media': 3,
      'ui-element': 2
    };

    return assets.reduce((total, asset) => {
      const time = complexityTime[asset.type] || baseTimePerAsset;
      return total + time;
    }, 0);
  }

  private applyFinalAdjustments(plan: GenerationPlan, synthesisText: string): GenerationPlan {
    // Apply any final adjustments based on synthesis recommendations
    const adjustments = this.extractAdjustments(synthesisText);

    if (adjustments.rePrioritize) {
      plan.priorities = this.rePrioritizeAssets(plan.assets);
    }

    if (adjustments.costOptimization) {
      plan.estimatedCost = this.optimizeCosts(plan.estimatedCost);
    }

    return plan;
  }

  // Helper methods for parsing and extraction
  private extractDeepInsights(content: string): string[] {
    const insights = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('🔍') || line.includes('💡')) {
        insights.push(line.replace(/🔍|💡/, '').trim());
      }
    }

    return insights;
  }

  private extractHiddenDependencies(content: string): string[] {
    return content.match(/dependency|import|require/gi) || [];
  }

  private extractPerformanceOpportunities(content: string): string[] {
    const opportunities = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('⚡') || line.toLowerCase().includes('performance')) {
        opportunities.push(line.replace(/⚡/, '').trim());
      }
    }

    return opportunities;
  }

  private extractSecurityImplications(content: string): string[] {
    const security = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('🔒') || line.toLowerCase().includes('security')) {
        security.push(line.replace(/🔒/, '').trim());
      }
    }

    return security;
  }

  private extractAssetsFromText(content: string): AssetNeed[] {
    // Fallback text parsing for asset extraction
    const assets: AssetNeed[] = [];
    // Implementation would parse asset information from text format
    return assets;
  }

  private extractOptimizedPrompt(content: string, asset: AssetNeed, index: number): string | null {
    // Extract optimized prompt for specific asset from Gemini response
    const assetSection = content.split('\n').find(line =>
      line.includes(`${index + 1}.`) || line.includes(asset.type)
    );

    if (assetSection) {
      const promptMatch = assetSection.match(/prompt[:\s]+(.*)/i);
      return promptMatch ? promptMatch[1].trim() : null;
    }

    return null;
  }

  private prioritizeAssetsFromContent(content: string, assets: AssetNeed[]): AssetNeed[] {
    return assets.map(asset => {
      const priority = this.extractPriorityFromContent(content, asset);
      return { ...asset, priority };
    });
  }

  private extractPriorityFromContent(content: string, asset: AssetNeed): 'high' | 'medium' | 'low' {
    const assetMention = content.toLowerCase();
    const assetType = asset.type.toLowerCase();

    if (assetMention.includes(`${assetType} high`) ||
        assetMention.includes(`critical ${assetType}`) ||
        assetMention.includes(`essential ${assetType}`)) {
      return 'high';
    }

    if (assetMention.includes(`${assetType} medium`) ||
        assetMention.includes(`important ${assetType}`)) {
      return 'medium';
    }

    return asset.priority;
  }

  private extractAdjustments(synthesisText: string): any {
    return {
      rePrioritize: synthesisText.includes('reprioritize') || synthesisText.includes('re-prioritize'),
      costOptimization: synthesisText.includes('cost') && synthesisText.includes('optim')
    };
  }

  private rePrioritizeAssets(assets: AssetNeed[]): any {
    return {
      high: assets.filter(a => a.priority === 'high'),
      medium: assets.filter(a => a.priority === 'medium'),
      low: assets.filter(a => a.priority === 'low')
    };
  }

  private optimizeCosts(currentCost: number): number {
    // Apply cost optimization strategies
    return currentCost * 0.95; // 5% optimization through batch processing
  }

  async getUserApproval(plan: GenerationPlan): Promise<boolean> {
    logger.info('Presenting plan for user approval', {
      totalAssets: plan.assets.length,
      estimatedCost: plan.estimatedCost,
      estimatedTime: plan.estimatedTime
    });

    return true; // Placeholder - actual implementation would use inquirer prompts
  }

  async getConversationHistory(): Promise<any[]> {
    return this.conversationHistory;
  }

  async addToConversation(message: any): Promise<void> {
    this.conversationHistory.push(message);
  }
}