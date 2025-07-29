fetch('firmware.json')
  .then(response => response.json())
  .then(data => {
    const container = document.getElementById('contenedor-productos');
    const hashCache = {}; // path -> hash

    const hashFetches = [];

    // Preload all sha256.txt
    data.forEach(producto => {
      const versionPath = producto.version.replaceAll('.', '_');
      producto.variantes.forEach(variant => {
        const sufijo = variant.sufijo_carpeta || '';
        const carpeta = `bin/${producto.producto}/${versionPath}${sufijo}`;
        const archivo = producto.archivo;
        const shaPath = `${carpeta}/sha256.txt`;
        const key = `${carpeta}/${archivo}`;

        const fetchPromise = fetch(shaPath)
          .then(res => res.ok ? res.text() : '')
          .then(text => {
            const match = text.split('\n').find(line => line.includes(archivo));
            const hash = match ? match.split(' ')[0] : null;
            if (hash) {
              hashCache[key] = hash;
            }
          })
          .catch(() => {
            hashCache[key] = null;
          });

        hashFetches.push(fetchPromise);
      });
    });

    Promise.all(hashFetches).then(() => {
      data.forEach(producto => {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4 col-xl-3';

        const card = document.createElement('div');
        card.className = 'card h-100 p-2';

        const img = document.createElement('img');
        img.src = producto.imagen;
        img.className = 'card-img-top img-fluid';
        img.style.maxHeight = '300px';
        img.style.objectFit = 'contain';

        const body = document.createElement('div');
        body.className = 'card-body p-2 small';

        const title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = producto.nombre_display || producto.producto;

        const subtitle = document.createElement('div');
        subtitle.className = 'card-subtitle text-muted small';
        subtitle.textContent = producto.nombre_subtitulo || "\u00A0";

        const versionLabel = document.createElement('p');
        versionLabel.className = 'mb-1';
        versionLabel.innerHTML = `<strong>Versión Firmware:</strong> ${producto.version}`;

        const variantRow = document.createElement('div');
        variantRow.className = 'row align-items-center gx-1 mb-2';

        const labelCol = document.createElement('div');
        labelCol.className = 'col-auto';
        labelCol.innerHTML = '<label class="form-label mb-0"><strong>Variante:</strong></label>';

        const selectCol = document.createElement('div');
        selectCol.className = 'col';

        const select = document.createElement('select');
        select.className = 'form-select form-select-sm';
        selectCol.appendChild(select);

        variantRow.append(labelCol, selectCol);

        producto.variantes.forEach((v, i) => {
          const option = document.createElement('option');
          option.value = i;
          option.textContent = v.nombre_display;
          select.appendChild(option);
        });

        const hashDisplay = document.createElement('p');
        hashDisplay.innerHTML = `
          <strong>SHA256:</strong>
          <span class="fw-hash d-inline-block" style="cursor: pointer;" title="Click para copiar">
            <span class="hash-short"></span>
            <span class="hash-full d-none"></span>
          </span>
        `;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-turquoise btn-sm w-100';
        downloadBtn.textContent = 'Descargar Firmware';

        let currentVar = null;

        function updateInfo(index) {
          currentVar = producto.variantes[index];
          const nombreTecnico = currentVar.sufijo_carpeta || '';
          const version = producto.version;
          const versionPath = version.replaceAll('.', '_');
          const carpeta = `bin/${producto.producto}/${versionPath}${nombreTecnico}`;
          const archivo = producto.archivo;
          const binPath = `${carpeta}/${archivo}`;
          const key = `${carpeta}/${archivo}`;

          const hash = hashCache[key];
          if (hash) {
            const short = `${hash.slice(0, 8)}…${hash.slice(-8)}`;
            hashDisplay.querySelector('.hash-short').textContent = short;
            hashDisplay.querySelector('.hash-full').textContent = hash;

            const hashSpan = hashDisplay.querySelector('.fw-hash');
            const shortSpan = hashSpan.querySelector('.hash-short');

            hashSpan.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();

              navigator.clipboard.writeText(hash)
                .then(() => {
                  const original = shortSpan.textContent;
                  shortSpan.textContent = 'Copiado!';
                  hashSpan.style.color = '#198754';

                  setTimeout(() => {
                    shortSpan.textContent = original;
                    hashSpan.style.color = '';
                  }, 1500);
                })
                .catch(err => {
                  console.error("Copy failed:", err);
                  alert("No se pudo copiar el hash. Intente manualmente.");
                });
            };

            hashSpan.ontouchstart = (e) => {
              e.preventDefault();
              hashSpan.onclick(e);
            };
          } else {
            hashDisplay.querySelector('.fw-hash').textContent = 'No disponible';
          }

          downloadBtn.onclick = () => {
            const nombreFinal = `${producto.producto}_${versionPath}${nombreTecnico}.bin`;

            // Feedback visual
            downloadBtn.disabled = true;
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = `
              <span class="spinner-border spinner-border-sm text-light me-1" role="status" aria-hidden="true"></span>
              Descargando…
            `;

            fetch(binPath)
              .then(res => {
                if (!res.ok) throw new Error("Archivo no encontrado");
                return res.blob();
              })
              .then(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = nombreFinal;
                a.click();
              })
              .catch(() => alert('No se pudo descargar el firmware. Contacte con soporte.'))
              .finally(() => {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalText;
              });
          };
        }

        select.addEventListener('change', () => updateInfo(select.value));
        updateInfo(0);

        body.append(title, subtitle, versionLabel, variantRow, hashDisplay, downloadBtn);
        card.append(img, body);
        col.appendChild(card);
        container.appendChild(col);
      });
    });
  })
  .catch(err => {
    document.getElementById('contenedor-productos').textContent = "Error al cargar los datos.";
    console.error("Error cargando firmware.json:", err);
  });