package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import java.util.List;
import java.time.LocalDate;
import java.time.ZoneId;

@Entity
@Table(name = "clase_teologia")
public class ClaseTeologia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idClaseTeologia;

    @Column(name = "anio", nullable = false)
    private Integer anio; 

    @ManyToOne
    @JoinColumn(name = "id_teologia", nullable = false)
    private Teologia teologia;

    @ManyToOne
    @JoinColumn(name = "id_instructor", nullable = false)
    private Persona instructor;

    @ManyToMany
    @JoinTable(
        name = "clase_teologia_estudiante",
        joinColumns = @JoinColumn(name = "id_clase_teologia"),
        inverseJoinColumns = @JoinColumn(name = "id_estudiante")
    )
    private List<Persona> estudiantes;

    @Column(length = 20)
    private String estado = "Activo"; // Activo o Finalizado

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDate fechaCreacion;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDate.now(ZoneId.of("America/Caracas"));
    }

    // --- GETTERS Y SETTERS ---
    public Integer getIdClaseTeologia() { return idClaseTeologia; }
    public void setIdClaseTeologia(Integer idClaseTeologia) { this.idClaseTeologia = idClaseTeologia; }

    public Integer getAnio() { return anio; }
    public void setAnio(Integer anio) { this.anio = anio; }

    public Teologia getTeologia() { return teologia; }
    public void setTeologia(Teologia teologia) { this.teologia = teologia; }

    public Persona getInstructor() { return instructor; }
    public void setInstructor(Persona instructor) { this.instructor = instructor; }

    public List<Persona> getEstudiantes() { return estudiantes; }
    public void setEstudiantes(List<Persona> estudiantes) { this.estudiantes = estudiantes; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public LocalDate getFechaCreacion() { return fechaCreacion; }
}