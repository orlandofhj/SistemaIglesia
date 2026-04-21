package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;

@Entity
@Table(name = "evento")
public class Evento {

    @Id
    @Column(name = "id_post") // Usamos el ID del post como PK
    private Integer idPost;

    @OneToOne
    @JoinColumn(name = "id_post", insertable = false, updatable = false)
    private Post post;

    @Column(length = 100, nullable = false)
    private String lugar;

    // --- COLUMNAS DE CONTROL Y EJECUCIÓN (IGUAL QUE SERVICIOS) ---
    private String estado = "Pendiente";
    private Boolean oculto = false;
    private Integer asistentes = 0;
    
    @Column(columnDefinition = "TEXT")
    private String observaciones;
    
    @Column(columnDefinition = "TEXT")
    private String novedades;
    
    @Column(name = "foto_url")
    private String fotoUrl;

    // Getters y Setters
    public Integer getIdPost() { return idPost; }
    public void setIdPost(Integer idPost) { this.idPost = idPost; }
    public Post getPost() { return post; }
    public void setPost(Post post) { this.post = post; }
    public String getLugar() { return lugar; }
    public void setLugar(String lugar) { this.lugar = lugar; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public Boolean getOculto() { return oculto; }
    public void setOculto(Boolean oculto) { this.oculto = oculto; }
    public Integer getAsistentes() { return asistentes; }
    public void setAsistentes(Integer asistentes) { this.asistentes = asistentes; }
    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
    public String getNovedades() { return novedades; }
    public void setNovedades(String novedades) { this.novedades = novedades; }
    public String getFotoUrl() { return fotoUrl; }
    public void setFotoUrl(String fotoUrl) { this.fotoUrl = fotoUrl; }
}