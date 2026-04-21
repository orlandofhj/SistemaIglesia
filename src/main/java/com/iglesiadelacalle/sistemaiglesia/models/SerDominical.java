package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;

@Entity
@Table(name = "ser_dominical")
public class SerDominical {
    
    @Id
    @Column(name = "id_post")
    private Integer idPost;

    @OneToOne
    @JoinColumn(name = "id_post", insertable = false, updatable = false)
    private Post post;

    @ManyToOne 
    @JoinColumn(name = "id_maestro")
    private Persona maestro;

    @ManyToOne 
    @JoinColumn(name = "id_lider")
    private Persona lider;

    // --- NUEVAS COLUMNAS QUE SE CREARÁN AUTOMÁTICAMENTE ---
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
    public Persona getMaestro() { return maestro; }
    public void setMaestro(Persona maestro) { this.maestro = maestro; }
    public Persona getLider() { return lider; }
    public void setLider(Persona lider) { this.lider = lider; }
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