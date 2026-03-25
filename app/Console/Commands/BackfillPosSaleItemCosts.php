<?php

namespace App\Console\Commands;

use App\Models\PosSaleItem;
use Illuminate\Console\Command;

class BackfillPosSaleItemCosts extends Command
{
    /**
     * Estimates historical line cost from each product's *current* purchase_cost.
     * Past purchase prices are not stored elsewhere; treat results as approximate.
     */
    protected $signature = 'pos:backfill-sale-item-costs
                            {--dry-run : Show counts and examples without writing}
                            {--force : Run without confirmation prompt}';

    protected $description = 'Backfill pos_sale_items purchase_cost and line_cost from products.purchase_cost (approximate for old sales)';

    public function handle(): int
    {
        if ($this->option('dry-run')) {
            $this->warn('Dry run: no database changes will be made.');
        } else {
            $this->warn('This uses each product\'s current purchase_cost for all matching sale lines.');
            $this->warn('Historical accuracy is not guaranteed if costs changed over time.');
            if (!$this->option('force') && !$this->confirm('Continue?', true)) {
                $this->info('Aborted.');
                return self::SUCCESS;
            }
        }

        $query = PosSaleItem::query()
            ->where('line_cost', '<=', 0)
            ->whereNotNull('product_id')
            ->whereHas('product');

        $total = (clone $query)->count();

        if ($total === 0) {
            $this->info('No sale items need backfill (line_cost already set, or no linked product).');
            return self::SUCCESS;
        }

        $this->info("Sale items to update: {$total}");

        $updated = 0;
        $skippedZeroProductCost = 0;

        $query->with('product:id,purchase_cost')->chunkById(500, function ($items) use (&$updated, &$skippedZeroProductCost) {
            foreach ($items as $item) {
                $purchaseCost = (float) ($item->product?->purchase_cost ?? 0);
                if ($purchaseCost <= 0) {
                    $skippedZeroProductCost++;
                    continue;
                }

                $qty = (int) ($item->qty ?? 0);
                $lineCost = round($purchaseCost * $qty, 2);

                if (!$this->option('dry-run')) {
                    $item->update([
                        'purchase_cost' => $purchaseCost,
                        'line_cost' => $lineCost,
                    ]);
                }

                $updated++;
            }
        });

        $this->newLine();
        $this->info($this->option('dry-run') ? "Would update: {$updated} rows." : "Updated: {$updated} rows.");
        if ($skippedZeroProductCost > 0) {
            $this->comment("Skipped (product purchase_cost is 0): {$skippedZeroProductCost} rows.");
        }

        return self::SUCCESS;
    }
}
