<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth-admin',
});
</script>

<template>
  <ReferenceTable
    title="Difficulties"
    item-name="Difficulty"
    item-name-plural="Difficulties"
    item-name-lowercase="difficulty"
    item-name-plural-lowercase="сложностей"
    api-path="difficulties"
    name-placeholder="e.g., easy, medium, hard"
    display-name-placeholder="e.g., Easy, Medium, Hard"
  />
</template>

