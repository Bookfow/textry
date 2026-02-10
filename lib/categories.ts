export const CATEGORIES = [
    { value: 'technology', label: '기술', icon: '💻', color: 'blue' },
    { value: 'it', label: 'IT/컴퓨터', icon: '🖥️', color: 'sky' },
    { value: 'business', label: '비즈니스', icon: '💼', color: 'purple' },
    { value: 'novel', label: '소설', icon: '📖', color: 'pink' },
    { value: 'essay', label: '에세이', icon: '✍️', color: 'green' },
    { value: 'science', label: '과학', icon: '🔬', color: 'cyan' },
    { value: 'art', label: '예술', icon: '🎨', color: 'red' },
    { value: 'education', label: '교육', icon: '🎓', color: 'yellow' },
    { value: 'health', label: '건강', icon: '💪', color: 'emerald' },
    { value: 'food', label: '요리', icon: '🍳', color: 'orange' },
    { value: 'travel', label: '여행', icon: '✈️', color: 'indigo' },
    { value: 'other', label: '기타', icon: '📝', color: 'gray' },
  ] as const
  
  export type CategoryValue = typeof CATEGORIES[number]['value']
  
  export function getCategoryLabel(value: string | null): string {
    if (!value) return '카테고리 없음'
    const category = CATEGORIES.find(c => c.value === value)
    return category ? category.label : '카테고리 없음'
  }
  
  export function getCategoryColor(value: string | null): string {
    if (!value) return 'gray'
    const category = CATEGORIES.find(c => c.value === value)
    return category ? category.color : 'gray'
  }
  
  export function getCategoryIcon(value: string | null): string {
    if (!value) return '📄'
    const category = CATEGORIES.find(c => c.value === value)
    return category ? category.icon : '📄'
  }