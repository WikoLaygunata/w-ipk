<script setup>
import { useGpaStore } from '../stores/gpaStore'

const store = useGpaStore()
</script>

<template>
  <div class="bg-cardBg rounded-xl shadow-sm border border-borderLight overflow-hidden">
    <div class="bg-brand-50 px-4 py-3 border-b border-borderLight">
      <h3 class="font-display font-semibold text-brand-900">Grade Configuration (BINUS Scale)</h3>
    </div>
    <div class="p-4 overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="text-textMuted border-b border-borderLight">
            <th class="pb-2 font-medium">Grade</th>
            <th class="pb-2 font-medium">Min Score</th>
            <th class="pb-2 font-medium">Weight</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(config, idx) in store.gradeConfig" :key="idx" class="border-b border-borderLight last:border-0 hover:bg-lightBg">
            <td class="py-2">
              <input v-model="config.grade" class="w-16 font-bold bg-transparent border-none focus:ring-1 focus:ring-brand-500 rounded px-1" />
            </td>
            <td class="py-2">
              <input type="number" v-model.number="config.minScore" class="w-20 bg-transparent border-none focus:ring-1 focus:ring-brand-500 rounded px-1" />
            </td>
            <td class="py-2">
              <input type="number" step="0.01" v-model.number="config.weight" class="w-20 bg-transparent border-none focus:ring-1 focus:ring-brand-500 rounded px-1" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
