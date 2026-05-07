<script setup lang="ts">
definePageMeta({
  layout: 'default',
});
</script>

<template>
  <ReferenceTable
    title="Grenade Types"
    item-name="Grenade Type"
    item-name-plural="Grenade Types"
    item-name-lowercase="grenade type"
    item-name-plural-lowercase="типов гранат"
    api-path="grenade-types"
    name-placeholder="e.g., smoke, flash, molotov"
    display-name-placeholder="e.g., Smoke, Flash, Molotov"
  />
</template>
