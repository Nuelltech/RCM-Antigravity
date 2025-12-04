# Public Assets Directory

Esta pasta contém todos os ficheiros estáticos (imagens, vídeos, ícones) utilizados na aplicação.

## Estrutura Recomendada

```
public/
├── videos/
│   └── hero-video.mp4    # Vídeo de fundo da hero section
├── images/
│   ├── features/         # Imagens das funcionalidades
│   ├── screenshots/      # Screenshots da app
│   └── logo.png         # Logo do restaurante
└── icons/
    └── ...              # Ícones customizados
```

## Como Adicionar Ficheiros

1. Arraste os ficheiros para as pastas correspondentes
2. No código, referencie-os a partir da raiz: `/videos/hero-video.mp4` ou `/images/feature-1.jpg`

## Requisitos para o Vídeo Hero

- **Formato**: MP4 (codec H.264)
- **Resolução**: 1920x1080 ou 1280x720
- **Tamanho**: < 10MB (comprimido)
- **Duração**: 10-30 segundos (para loop suave)

## Exemplo de Uso

```tsx
<video autoPlay loop muted playsInline>
  <source src="/videos/hero-video.mp4" type="video/mp4" />
</video>

<img src="/images/features/dashboard.jpg" alt="Dashboard" />
```
