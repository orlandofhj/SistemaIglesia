package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import java.util.List;

// Importa esto al principio del archivo
    import java.time.ZoneId;
    import java.time.LocalDate;

@Entity
@Table(name = "ministerio")
public class Ministerio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idMinisterio;

    @Column(length = 50, nullable = false)
    private String denominacion;

    // ⚡ UN SOLO RESPONSABLE
    @ManyToOne
    @JoinColumn(name = "id_responsable")
    private Persona responsable;

    public Persona getResponsable() { return responsable; }
    public void setResponsable(Persona responsable) { this.responsable = responsable; }

    // ⚡ LISTA DE INTEGRANTES (Cualquier persona, registrada o no)
    @ManyToMany
    @JoinTable(
        name = "ministerio_integrantes",
        joinColumns = @JoinColumn(name = "id_ministerio"),
        inverseJoinColumns = @JoinColumn(name = "id_persona")
    )
    private List<Persona> integrantes;

    // Getters y Setters
    public Integer getIdMinisterio() { return idMinisterio; }
    public void setIdMinisterio(Integer idMinisterio) { this.idMinisterio = idMinisterio; }

    public String getDenominacion() { return denominacion; }
    public void setDenominacion(String denominacion) { this.denominacion = denominacion; }
   

    public List<Persona> getIntegrantes() { return integrantes; }
    public void setIntegrantes(List<Persona> integrantes) { this.integrantes = integrantes; }

    // ⚡ NUEVA VARIABLE
    @Column(columnDefinition = "boolean default true")
    private Boolean activo = true;

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    @Column(name = "fecha_creacion", updatable = false)
    private java.time.LocalDate fechaCreacion;

    public java.time.LocalDate getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(java.time.LocalDate fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        // Esto garantiza que no importa donde esté el servidor, 
        // la fecha siempre será la de Caracas, Venezuela.
        this.fechaCreacion = LocalDate.now(ZoneId.of("America/Caracas"));
    }
}