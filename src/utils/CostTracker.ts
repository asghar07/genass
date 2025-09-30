import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { logger } from './logger';

export interface CostEntry {
  timestamp: string;
  operation: string;
  cost: number;
  tokensUsed?: number;
  assetsGenerated?: number;
  model: string;
}

export interface CostSummary {
  totalCost: number;
  totalAssets: number;
  totalOperations: number;
  averageCostPerAsset: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
}

export class CostTracker {
  private costFilePath: string;
  private budgetLimit: number;

  constructor(budgetLimit: number = 10.0) {
    this.costFilePath = path.join(os.homedir(), '.genass', 'costs.json');
    this.budgetLimit = budgetLimit;
  }

  async trackCost(entry: CostEntry): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.costFilePath));

      // Load existing costs
      let costs: CostEntry[] = [];
      if (await fs.pathExists(this.costFilePath)) {
        costs = await fs.readJson(this.costFilePath);
      }

      // Add new entry
      costs.push({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString()
      });

      // Save updated costs
      await fs.writeJson(this.costFilePath, costs, { spaces: 2 });

      logger.debug('Cost tracked', entry);

      // Check budget
      await this.checkBudget();

    } catch (error) {
      logger.warn('Failed to track cost', error);
    }
  }

  async getCostSummary(): Promise<CostSummary> {
    try {
      if (!await fs.pathExists(this.costFilePath)) {
        return this.getEmptySummary();
      }

      const costs: CostEntry[] = await fs.readJson(this.costFilePath);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalCost = costs.reduce((sum, entry) => sum + entry.cost, 0);
      const totalAssets = costs.reduce((sum, entry) => sum + (entry.assetsGenerated || 0), 0);

      const todayCosts = costs.filter(e => new Date(e.timestamp) >= today);
      const weekCosts = costs.filter(e => new Date(e.timestamp) >= weekAgo);
      const monthCosts = costs.filter(e => new Date(e.timestamp) >= monthAgo);

      return {
        totalCost,
        totalAssets,
        totalOperations: costs.length,
        averageCostPerAsset: totalAssets > 0 ? totalCost / totalAssets : 0,
        today: todayCosts.reduce((sum, e) => sum + e.cost, 0),
        thisWeek: weekCosts.reduce((sum, e) => sum + e.cost, 0),
        thisMonth: monthCosts.reduce((sum, e) => sum + e.cost, 0)
      };

    } catch (error) {
      logger.warn('Failed to get cost summary', error);
      return this.getEmptySummary();
    }
  }

  async checkBudget(): Promise<{ withinBudget: boolean; used: number; limit: number }> {
    const summary = await this.getCostSummary();

    const withinBudget = summary.thisMonth <= this.budgetLimit;

    if (!withinBudget) {
      logger.warn('Monthly budget exceeded!', {
        used: summary.thisMonth,
        limit: this.budgetLimit
      });
    }

    return {
      withinBudget,
      used: summary.thisMonth,
      limit: this.budgetLimit
    };
  }

  async setBudgetLimit(limit: number): Promise<void> {
    this.budgetLimit = limit;

    // Save to config
    const configPath = path.join(os.homedir(), '.genass', 'config.json');
    let config: any = {};

    if (await fs.pathExists(configPath)) {
      config = await fs.readJson(configPath);
    }

    config.budgetLimit = limit;
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, config, { spaces: 2 });

    logger.info('Budget limit updated', { limit });
  }

  async resetCosts(): Promise<void> {
    if (await fs.pathExists(this.costFilePath)) {
      await fs.remove(this.costFilePath);
      logger.info('Cost history cleared');
    }
  }

  private getEmptySummary(): CostSummary {
    return {
      totalCost: 0,
      totalAssets: 0,
      totalOperations: 0,
      averageCostPerAsset: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    };
  }
}